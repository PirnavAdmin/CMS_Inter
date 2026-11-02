export const STORAGE_KEY = "pirnav-inventory-demo-v1";
export const DEPARTMENTS = [
  "Computer Science",
  "Physics",
  "Chemistry",
  "Administration",
  "Library",
  "Sports",
  "Maintenance",
  "Academic Office",
];
export const UNITS = [
  "Pieces",
  "Nos",
  "Boxes",
  "Packs",
  "Sets",
  "Bottles",
  "Litres",
  "Kilograms",
  "Grams",
  "Metres",
  "Rolls",
  "Reams",
  "Pairs",
  "Units",
];
export const ISSUE_TYPES = [
  "Academic Department",
  "Administration",
  "Faculty / Staff",
  "Student",
  "Laboratory",
  "Library",
  "Maintenance",
  "Other",
];
const categoryNames = [
  "IT Equipment",
  "Computer Accessories",
  "Laboratory Equipment",
  "Laboratory Chemicals",
  "Stationery",
  "Classroom Supplies",
  "Furniture",
  "Electrical Equipment",
  "Sports Equipment",
  "Library Supplies",
  "Cleaning Supplies",
  "Safety Equipment",
  "Maintenance Supplies",
  "Office Equipment",
  "Other",
];
const supplierSeeds = [
  ["Deccan Digital Supplies", "DDS-001", "Ananya Rao", "9876501001", [1, 2, 14]],
  ["Vidya Scientific Traders", "VST-002", "Kiran Shah", "9876501002", [3, 4]],
  ["Campus Paper & Office", "CPO-003", "Meera Nair", "9876501003", [5, 6, 10]],
  ["Greenfield Furnishings", "GFF-004", "Arjun Patil", "9876501004", [7, 9]],
  ["Safe Campus Essentials", "SCE-005", "Priya Reddy", "9876501005", [8, 11, 12, 13]],
];
// Opening balances precede all seeded transactions. These are fictional demo records.
const itemSeeds = [
  ["Laptop", 1, "Nos", 12, 5, 48000, 1, "Computer Science"],
  ["Desktop Computer", 1, "Nos", 18, 6, 35000, 1, "Computer Science"],
  ["Projector", 1, "Nos", 4, 3, 29000, 1, "Academic Office"],
  ["Printer", 14, "Nos", 3, 2, 14500, 1, "Administration"],
  ["Printer Paper", 5, "Reams", 24, 20, 285, 3, "Administration"],
  ["Whiteboard Marker", 6, "Boxes", 8, 12, 240, 3, "Academic Office"],
  ["Notebook", 5, "Pieces", 85, 30, 65, 3, "Academic Office"],
  ["Office Chair", 7, "Nos", 15, 5, 3200, 4, "Administration"],
  ["Office Desk", 7, "Nos", 6, 3, 7800, 4, "Administration"],
  ["Laboratory Microscope", 3, "Nos", 8, 4, 16500, 2, "Physics"],
  ["Laboratory Glassware", 3, "Sets", 12, 15, 1250, 2, "Chemistry"],
  ["Laboratory Chemicals", 4, "Bottles", 6, 10, 780, 2, "Chemistry"],
  ["Sports Equipment", 9, "Sets", 5, 3, 2400, 4, "Sports"],
  ["First Aid Kit", 12, "Sets", 2, 5, 950, 5, "Administration"],
  ["Cleaning Liquid", 11, "Litres", 30, 15, 120, 5, "Maintenance"],
  ["LED Bulb", 8, "Pieces", 20, 10, 180, 5, "Maintenance"],
  ["Network Cable", 2, "Metres", 100, 40, 28, 1, "Computer Science"],
  ["Keyboard", 2, "Nos", 10, 8, 650, 1, "Computer Science"],
  ["Mouse", 2, "Nos", 0, 10, 350, 1, "Computer Science"],
  ["Fire Extinguisher", 12, "Nos", 7, 3, 2100, 5, "Maintenance"],
  ["Library Book Labels", 10, "Rolls", 14, 5, 110, 3, "Library"],
  ["Maintenance Tool Kit", 13, "Sets", 3, 2, 1850, 5, "Maintenance"],
];

export function createDemoState() {
  const categories = categoryNames.map((name, index) => ({
    id: `cat-${index + 1}`,
    name,
    code: `CAT-${String(index + 1).padStart(3, "0")}`,
    description: `College ${name.toLowerCase()} and supplies`,
    department: "Administration",
    status: "Active",
  }));
  const suppliers = supplierSeeds.map(([name, code, contact, phone, cats], index) => ({
    id: `sup-${index + 1}`,
    name,
    code,
    contact,
    phone,
    email: `sales${index + 1}@example.com`,
    gstin: "",
    address1: `${15 + index} College Road`,
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "500001",
    country: "India",
    categoryIds: cats.map((n) => `cat-${n}`),
    paymentTerms: "Net 30 days",
    status: "Active",
  }));
  const items = itemSeeds.map(
    ([name, cat, unit, openingQty, minStock, unitCost, supplier, department], index) => ({
      id: `item-${index + 1}`,
      name,
      code: `INV-${String(index + 1).padStart(4, "0")}`,
      categoryId: `cat-${cat}`,
      description: `${name} for college use`,
      unit,
      type: [1, 3, 7, 14].includes(cat) ? "Asset" : "Consumable",
      brand: "",
      model: "",
      sku: `SKU-${index + 1}`,
      department,
      location: `${department} Store`,
      rack: `R-${(index % 4) + 1}`,
      openingQty,
      openingCost: unitCost,
      quantity: openingQty,
      minStock,
      maxStock: Math.max(openingQty * 3, minStock * 4),
      reorderQty: minStock * 2,
      unitCost,
      supplierId: `sup-${supplier}`,
      status: "Active",
      purchaseDate: "2026-08-01",
      createdAt: "2026-08-01",
      updatedAt: "2026-08-01",
      warrantyDate: cat === 1 ? "2027-08-01" : "",
      remarks: "Demo inventory",
    }),
  );
  const movements = [];
  for (let index = 0; index < 18; index++) {
    const item = items[index];
    const type = index % 2 === 0 ? "Stock In" : "Stock Out";
    const quantity = type === "Stock In" ? 3 : Math.min(2, item.quantity);
    item.quantity += type === "Stock In" ? quantity : -quantity;
    item.updatedAt = "2026-09-15";
    if (type === "Stock In") item.lastPurchaseDate = "2026-09-15";
    movements.push({
      id: `txn-${index + 1}`,
      number: `INV-TXN-${String(index + 1).padStart(6, "0")}`,
      sequence: index + 1,
      itemId: item.id,
      type,
      date: `2026-09-${String(1 + (index % 15)).padStart(2, "0")}`,
      quantity,
      unitCost: item.unitCost,
      total: quantity * item.unitCost,
      supplierId: type === "Stock In" ? item.supplierId : "",
      department: item.department,
      location: item.location,
      recipient: type === "Stock Out" ? "Dr. S. Kumar" : "",
      performedBy: "Demo Store Administrator",
      reference: `REF-2026-${index + 1}`,
      invoice: type === "Stock In" ? `BILL-${index + 101}` : "",
      purpose: type === "Stock Out" ? "Teaching and department use" : "",
      issueType: "Academic Department",
      condition: "Good",
      remarks: "Initial demo transaction",
      status: "Posted",
      returnable: index === 1,
      expectedReturnDate: index === 1 ? "2026-10-30" : "",
      expiryDate: index === 11 ? "2027-02-28" : "",
      batch: index === 11 ? "CHEM-26-09" : "",
    });
    item.updatedAt = movements.at(-1).date;
    if (type === "Stock In") item.lastPurchaseDate = movements.at(-1).date;
    if (index === 14) {
      movements.at(-1).expiryDate = "2027-02-28";
      movements.at(-1).batch = "CLEAN-26-09";
    }
    if (type === "Stock Out") {
      movements.at(-1).expiryDate = "";
      movements.at(-1).batch = "";
    }
  }
  return {
    version: 1,
    items,
    suppliers,
    categories,
    movements,
    orders: [],
    activities: [
      {
        id: "act-seed",
        date: "2026-09-15",
        text: "Demo inventory initialized with reconciled opening balances.",
      },
    ],
    nextId: 19,
  };
}
