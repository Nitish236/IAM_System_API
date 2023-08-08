const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const { sendEmailWithAttachement } = require("../mailService/email");

// Models
const Department = require("../../models/departmentModel");
const AuditLog = require("../../models/auditLogModel");
const User = require("../../models/userModel");

// Projections for Queries
// Department
const projectionForDepartment = {
  description: 0,
  managerName: 0,
  employees: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// User
const projectionForUserToGetEmail = {
  _id: 0,
  firstName: 0,
  lastName: 0,
  role: 0,
  department: 0,
  username: 0,
  password: 0,
  createdAt: 0,
  updatedAt: 0,
  __v: 0,
};
// AuditLog
const projectionForAuditLog = {
  _id: 0,
  empId: 0,
  Id: 0,
  createdAt: 0,
  updatedAt: 0,
};

//                                     Function to Generate Department Report

function generateDepartmentReport(department, audits) {
  // Create a new PDF document
  const auditReport = new PDFDocument();

  // Set up the response headers for PDF download
  const fileName = `${department._id}_${getCurrentDate()}.pdf`;

  const pathName = path.resolve(__dirname, "../../");
  const filePath = path.join(
    pathName,
    "reports",
    department._id.toString(),
    fileName
  );
  auditReport.pipe(fs.createWriteStream(filePath));

  // Set the PDF document title
  auditReport
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("AuditLog Report", { align: "center" });
  auditReport.moveDown(2);

  // Generate the report content
  generateHeader(auditReport, department);

  generateAuditEntries(auditReport, audits, department);

  // Finalize the PDF document
  auditReport.end();

  return filePath;
}

//                                     Function to generate the audit entries

function generateAuditEntries(report, audits, department) {
  const auditsPerPage = parseInt(4) || 4;
  let currentPage = parseInt(1) || 1;
  let entryCount = parseInt(0) || 0;

  audits.forEach((audit) => {
    if (entryCount % auditsPerPage === 0 && entryCount > 0) {
      currentPage++;

      report.addPage();

      generateHeader(report, department);
    }

    // Template for each AuditLog
    report
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`Audit --`, { align: "left", indent: 10 });
    report.moveDown(1);
    report
      .font("Helvetica")
      .fontSize(12)
      .text(`UserName : ${audit.userName}`, { indent: 20 });
    report.moveDown(1);
    report
      .font("Helvetica")
      .fontSize(12)
      .text(`Type : ${audit.name}`, { indent: 20 });
    report.moveDown(1);
    report
      .font("Helvetica")
      .fontSize(10)
      .text(`Action : ${audit.action}`, { indent: 20 });

    entryCount++;

    report.moveDown(2);
  });
}

// Function to generate the report header
function generateHeader(report, department) {
  report
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(`${department.name} Department`, { align: "center" });
  report.moveDown(2);
}

// To Get Date in String format

function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

//                                 Function to Generate Report

const reportGenerator = async () => {
  // Get all Departments
  const departments = await Department.find({}, projectionForDepartment);

  // Generating AuditLog Reports for each of the Department
  departments.forEach((department) => {
    const pathName = path.resolve(__dirname, "../../");
    const departmentFolderPath = path.join(
      pathName,
      "reports",
      department._id.toString()
    );

    // Create folder for the department if it do not exists
    if (!fs.existsSync(departmentFolderPath)) {
      fs.mkdirSync(departmentFolderPath, { recursive: true });
    }

    // Get all AuditLog of the Department
    const audits = AuditLog.find({ Id: department._id }, projectionForAuditLog);

    // Testing data
    const fake = [
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
      {
        userName: "Nitish",
        name: "Create",
        action: "Created something ver necessary",
      },
    ];

    // Get Manager of the Department
    const manager = User.findOne(
      { _id: department.managerId },
      projectionForUserToGetEmail
    );

    // Creating the path to attach to email
    const filePath = generateDepartmentReport(department, audits);
    const fPath = filePath.substring(
      filePath.indexOf("reports"),
      filePath.length
    );

    /*         We will also send mail to the Admin's and Supar Admin's     */

    // Send email to the Manager
    sendEmailWithAttachement({
      email: manager.employee.email,
      department: department.name,
      filePath: fPath,
    });

    // Send email to the IAM Manager
    sendEmailWithAttachement({
      email: process.env.MAIL_USER,
      department: department.name,
      filePath: fPath,
    });

    console.log(`Department report generated and saved for ${department._id}`);
  });
};

//  Export the Functionality

module.exports = {
  reportGenerator,
};
