import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ims_website',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testPOVendor() {
  const connection = await pool.getConnection();
  
  try {
    // Get the PO
    const [pos] = await connection.query(
      'SELECT id, poNumber, supplierId FROM purchase_orders WHERE poNumber = ? LIMIT 1',
      ['']
    );
    
    if (pos.length === 0) {
      console.log('❌ PO not found');
      return;
    }
    
    const po = pos[0];
    console.log('✅ PO found:', po);
    
    if (!po.supplierId) {
      console.log('❌ supplierId is null or 0');
      return;
    }
    
    // Get the vendor
    const [vendors] = await connection.query(
      'SELECT id, name, vendorCode FROM vendors WHERE id = ? LIMIT 1',
      [po.supplierId]
    );
    
    if (vendors.length === 0) {
      console.log('❌ Vendor not found with ID:', po.supplierId);
      return;
    }
    
    const vendor = vendors[0];
    console.log('✅ Vendor found:', vendor);
    
  } finally {
    connection.release();
    await pool.end();
  }
}

testPOVendor().catch(console.error);
