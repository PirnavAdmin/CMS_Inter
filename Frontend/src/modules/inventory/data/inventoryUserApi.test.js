import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "vite";
import path from "node:path";
test("employee API requests use StaffId, preserve ownership, and do not invent mock records",async()=>{
 const values=new Map([["token","test-token"],["user",JSON.stringify({role:"Inventory Manager",staffId:42,employeeId:"INV-42"})]]);
 global.window={localStorage:{getItem:(k)=>values.get(k)??null,removeItem:(k)=>values.delete(k)},sessionStorage:{getItem:()=>null,removeItem:()=>{}}};
 const server=await createServer({configFile:false,root:process.cwd(),resolve:{alias:{"@":path.resolve("src")}},server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]}});
 try{
  const api=await server.ssrLoadModule('/src/Dashboard/InventoryDashboard/data/inventoryUserApi.js');
  const session=await server.ssrLoadModule('/src/Dashboard/InventoryDashboard/data/inventorySession.js');
  const client=(await server.ssrLoadModule('/src/api/apiClient.js')).default;
  const calls=[];let data=[];
  client.defaults.adapter=async(config)=>{calls.push(config);return{status:200,statusText:'OK',headers:{},config,data:{success:true,data}};};
  assert.equal(session.inventorySession().role,'Inventory Manager');assert.equal(api.staffIdentity(),'42');
  data=[{staffId:42,payslipId:7,payrollYear:2026,payrollMonth:9,netSalary:100},{staffId:43,payslipId:8,payrollYear:2026,payrollMonth:10,netSalary:200}];
  const slips=await api.loadPayslips({employeeId:'INV-42'});assert.equal(slips.length,1);assert.equal(slips[0].id,'7');assert.equal(calls.at(-1).params.search,'INV-42');
  data={staffId:43,payslipId:8};await assert.rejects(api.payslipDetail('8'),/does not belong/);
  data=[{staffId:42,staffLeaveRequestId:9,leaveCategoryName:'Sick Leave',startDate:'2026-10-15T00:00:00',endDate:'2026-10-15T00:00:00',totalDays:1,status:1},{staffId:43,staffLeaveRequestId:10,status:2}];
  const leaves=await api.loadLeaves();assert.equal(leaves.length,1);assert.equal(leaves[0].status,'Pending');assert.equal(calls.at(-1).params.staffId,'42');
  data={};await api.submitLeave({type:'Sick Leave',fromDate:'2026-10-15',toDate:'2026-10-16',reason:'Appointment'},[{id:'3',name:'Sick Leave'}]);
  const body=JSON.parse(calls.at(-1).data);assert.equal(body.staffId,42);assert.equal(body.leaveCategoryId,3);assert.equal(body.leaveType,2);
  await assert.rejects(api.submitLeave({type:'Invented'},[]),/active leave category/);
  values.set('user',JSON.stringify({role:'Admin',id:42}));assert.equal(session.inventorySession(),null);assert.throws(()=>api.staffIdentity(),/StaffId/);
 }finally{await server.close();delete global.window;}
});
