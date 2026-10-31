const fs = require('fs');
const file = 'Backend/src/CollegeManagement.API/Program.cs';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add repo registrations
const repoTarget = 'builder.Services.AddScoped<ITransportRepository, TransportRepository>();';
const repoAdd = 'builder.Services.AddScoped<ITransportRepository, TransportRepository>();\r\nbuilder.Services.AddScoped<ITransportOperationsRepository, TransportOperationsRepository>();\r\nbuilder.Services.AddScoped<ITransportDriverDashboardRepository, TransportDriverDashboardRepository>();';

if (!content.includes('ITransportOperationsRepository')) {
  content = content.replace(repoTarget, repoAdd);
}

// 2. Add service registrations
const svcTarget = 'builder.Services.AddScoped<IDriverAttendanceService, DriverAttendanceService>();';
const svcAdd = 'builder.Services.AddScoped<IDriverAttendanceService, DriverAttendanceService>();\r\nbuilder.Services.AddScoped<ITransportOperationsService, TransportOperationsService>();\r\nbuilder.Services.AddScoped<ITransportDriverDashboardService, TransportDriverDashboardService>();';

if (!content.includes('ITransportOperationsService')) {
  content = content.replace(svcTarget, svcAdd);
}

// 3. Add test runner
const marker = 'if (args.Contains("--test-promotion"))';
const markerIdx = content.indexOf(marker);
if (markerIdx !== -1 && !content.includes('--test-transport')) {
  const closingBraceIdx = content.indexOf('}', markerIdx);
  const insertPos = closingBraceIdx + 1;
  const transportTestBlock = `\r\n\r\nif (args.Contains("--test-transport"))\r\n{\r\n    var success = await CollegeManagement.API.Tests.TransportModuleBackendTester.RunAllTestsAsync(app.Services);\r\n    Environment.Exit(success ? 0 : 1);\r\n    return;\r\n}`;
  content = content.slice(0, insertPos) + transportTestBlock + content.slice(insertPos);
}

fs.writeFileSync(file, content, 'utf-8');
console.log('Program.cs updated successfully.');
