const fs = require('fs');

let pagePath = 'Frontend/src/components/pages/SectionAllocationPage.jsx';
let content = fs.readFileSync(pagePath, 'utf8');

// The API calls are passing 'context' instead of 'scopeContext'
content = content.replace(
    'apiClient.post(apiEndpoints.sectionRollAllocation.sectionPreview, context)',
    'apiClient.post(apiEndpoints.sectionRollAllocation.sectionPreview, scopeContext)'
).replace(
    'apiClient.post(apiEndpoints.sectionRollAllocation.sectionConfirm, context)',
    'apiClient.post(apiEndpoints.sectionRollAllocation.sectionConfirm, scopeContext)'
).replace(
    'apiClient.post(apiEndpoints.sectionRollAllocation.rollPreview, context)',
    'apiClient.post(apiEndpoints.sectionRollAllocation.rollPreview, scopeContext)'
).replace(
    'apiClient.post(apiEndpoints.sectionRollAllocation.rollConfirm, context)',
    'apiClient.post(apiEndpoints.sectionRollAllocation.rollConfirm, scopeContext)'
);

fs.writeFileSync(pagePath, content);
console.log("Patched Frontend SectionAllocationPage.jsx");
