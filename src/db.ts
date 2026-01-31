import * as Firebird from 'node-firebird';

let connection: any = null;

export async function connectToDatabase(): Promise<any> {
  if (connection) {
    console.log('Using existing database connection');
    return connection;
  }

  const options: Firebird.Options = {
    host: process.env.FIREBIRD_HOST || 'localhost',
    database: process.env.FIREBIRD_DATABASE || '',
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD || 'masterkey',
    port: 3050,
  };

  console.log('   Attempting to connect to Firebird database...');
  console.log(`   Host: ${options.host}`);
  console.log(`   Database: ${options.database}`);
  console.log(`   User: ${options.user}`);

  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) {
        console.error('Database connection failed:', err.message);
        reject(err);
        return;
      }
      console.log('Successfully connected to Firebird database!');
      connection = db;
      resolve(db);
    });
  });
}

// Helper function to list all tables (for debugging)
export async function listTables(): Promise<string[]> {
  const db = await connectToDatabase();

  return new Promise((resolve, reject) => {
    // Firebird system query to get table names
    db.query(
      `SELECT RDB$RELATION_NAME 
       FROM RDB$RELATIONS 
       WHERE RDB$SYSTEM_FLAG = 0 
       AND RDB$RELATION_TYPE = 0`,
      [],
      (err: any, result: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        const tables = result.map((row: any) => {
          const name = row.RDB$RELATION_NAME || row.rdb$relation_name;
          return name ? name.trim() : '';
        }).filter(Boolean);
        resolve(tables);
      }
    );
  });
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ id: number; username: string } | null> {
  const db = await connectToDatabase();

  console.log(`Attempting to authenticate user: ${username}`);

  return new Promise((resolve, reject) => {
    db.query(
      `SELECT USER_ID, USER_NAME, USER_EMAIL, COMPANY_NAME 
       FROM WEB_USERS 
       WHERE UPPER(USER_NAME) = UPPER(?) 
       AND USER_PWD = ? 
       AND ENABLED = 1`,
      [username, password],
      (err: any, result: any[]) => {
        if (err) {
          console.error('   Database query error:', err.message);
          console.error('   Table: WEB_USERS');
          console.error('   Columns: USER_ID, USER_NAME, USER_PWD, ENABLED');
          reject(err);
          return;
        }

        if (!result || result.length === 0) {
          console.log(`   No enabled user found with username: ${username}`);
          console.log('   Check: username, password, or ENABLED status');
          resolve(null);
          return;
        }

        const row = result[0];
        // Firebird returns uppercase column names by default, but handle both cases
        const userId = row.USER_ID || row.user_id;
        const userName = row.USER_NAME || row.user_name;

        console.log(`   User authenticated: ${userName} (ID: ${userId})`);
        console.log(`   Email: ${row.USER_EMAIL || row.user_email || 'N/A'}`);
        console.log(`   Company: ${row.COMPANY_NAME || row.company_name || 'N/A'}`);

        resolve({
          id: userId,
          username: userName,
        });
      }
    );
  });
}

export async function getCustomersForUser(userId: number): Promise<any[]> {
  const db = await connectToDatabase();

  console.log(`Fetching customers for user ID: ${userId}`);

  return new Promise((resolve, reject) => {
    // Step 1: Get CUST_USER_ID from ASSIGNED_USERS where GFS_USER_ID matches and ASSIGNED = 1
    db.query(
      `SELECT CUST_USER_ID 
       FROM ASSIGNED_USERS 
       WHERE GFS_USER_ID = ? 
       AND ASSIGNED = 1`,
      [userId],
      (err: any, assignedResult: any[]) => {
        if (err) {
          console.error('   Error fetching assigned users:', err.message);
          reject(err);
          return;
        }

        if (!assignedResult || assignedResult.length === 0) {
          console.log(`   No assigned customers found for user ${userId}`);
          resolve([]);
          return;
        }

        // Extract CUST_USER_ID values
        const custUserIds = assignedResult.map((row: any) => row.CUST_USER_ID || row.cust_user_id);
        console.log(`   Found ${custUserIds.length} assigned customer IDs`);

        // Step 2: Get COMPANY from CUSTOMERS table using CUST_USER_ID (matching CUSTOMERS.ID)
        const placeholders = custUserIds.map(() => '?').join(',');
        db.query(
          `SELECT ID, COMPANY 
           FROM CUSTOMERS 
           WHERE ID IN (${placeholders})`,
          custUserIds,
          (err2: any, customerResult: any[]) => {
            if (err2) {
              console.error('   Error fetching customers:', err2.message);
              reject(err2);
              return;
            }

            const customers = customerResult || [];
            console.log(`   Found ${customers.length} customers`);

            resolve(customers.map((row: any) => {
              const companyField = row.COMPANY || row.company;
              let companyName = '';

              // Convert Buffer to string if needed
              if (Buffer.isBuffer(companyField)) {
                companyName = companyField.toString('utf8').trim();
              } else if (companyField) {
                companyName = String(companyField).trim();
              }

              return {
                id: row.ID || row.id,
                company: companyName,
              };
            }));
          }
        );
      }
    );
  });
}

export async function getCustomerDetails(customerId: number, userId: number): Promise<any | null> {
  const db = await connectToDatabase();

  return new Promise((resolve, reject) => {
    // First verify the customer is assigned to this user using ASSIGNED_USERS table
    db.query(
      `SELECT CUST_USER_ID 
       FROM ASSIGNED_USERS 
       WHERE GFS_USER_ID = ? 
       AND CUST_USER_ID = ? 
       AND ASSIGNED = 1`,
      [userId, customerId],
      (err: any, assignedResult: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (!assignedResult || assignedResult.length === 0) {
          console.log(`   Customer ${customerId} is not assigned to user ${userId}`);
          resolve(null);
          return;
        }

        // Get full customer details from CUSTOMERS table
        db.query(
          `SELECT * FROM CUSTOMERS WHERE ID = ?`,
          [customerId],
          (err2: any, customerResult: any[]) => {
            if (err2) {
              reject(err2);
              return;
            }

            if (!customerResult || customerResult.length === 0) {
              resolve(null);
              return;
            }

            resolve(customerResult[0]);
          }
        );
      }
    );
  });
}