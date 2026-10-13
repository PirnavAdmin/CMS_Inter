const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'srv1061.hstgr.io',
    port: 3306,
    user: 'u819242402_CLM',
    password: 'Clm@2026',
    database: 'u819242402_CLM_System'
  });

  const check = async (userId, mod, act) => {
    const [res] = await conn.execute('CALL sp_CheckUserModuleAction(?, ?, ?)', [userId, mod, act]);
    const val = res[0] && res[0][0] ? res[0][0].HasPermission : 0;
    console.log(`User ${userId} [${mod} : ${act}] => ${val}`);
  };

  await check(876, 'timetable', 'view');
  await check(876, 'timetable', 'create');
  await check(876, 'timetable', 'edit');
  await check(876, 'timetable', 'delete');
  await check(876, 'student-management', 'view');
  await check(876, 'nonexistent', 'view');

  await conn.end();
}

test().catch(console.error);
