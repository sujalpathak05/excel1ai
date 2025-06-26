
# 🤖 Excel AI - Smart Excel Automation

A complete, production-ready web application for automating Excel file operations with an intuitive interface and powerful backend capabilities.

## 🚀 Features

### ✅ **File Upload & Processing**
- Support for `.xlsx`, `.xls`, and `.csv` files
- Drag & drop file upload interface
- Real-time data preview with statistics
- Automatic file parsing and validation

### ✅ **Data Cleaning & Transformation**
- **Remove Duplicates**: Select columns and remove duplicate rows
- **Trim Spaces**: Clean whitespace and special characters
- **Change Case**: Convert text to uppercase or lowercase
- **Find & Replace**: Replace text patterns across columns
- **Filter Data**: Filter rows based on various conditions
- **Sort Data**: Sort by any column in ascending/descending order

### ✅ **Advanced Analytics**
- **Summary Statistics**: Count, unique values, min/max, averages
- **Pivot Tables**: Dynamic pivot table generation with aggregations
- **Data Visualization**: Interactive charts (bar, line, pie)
- **Group Analysis**: Group by columns with aggregation functions

### ✅ **Export Capabilities**
- Export to CSV, Excel (.xlsx), and PDF formats
- Download processed data files
- Export charts and dashboards as images
- Automated report generation

### ✅ **Automation & Templates**
- Save operation sequences as reusable templates
- Operation queue system for batch processing
- Template library for common workflows
- User-specific template management

### ✅ **User Management**
- Secure JWT-based authentication
- User registration and login
- Role-based access control
- Session management

### ✅ **Modern UI/UX**
- Responsive design for all devices
- Interactive data tables
- Real-time operation feedback
- Drag & drop file uploads
- Clean, intuitive interface

## 🛠️ Technology Stack

### **Backend**
- **Node.js** with Express.js framework
- **SQLite** database for user and template storage
- **JWT** for authentication
- **Multer** for file upload handling
- **XLSX** library for Excel file processing
- **Papa Parse** for CSV handling

### **Frontend**
- **Vanilla JavaScript** (no framework dependencies)
- **Chart.js** for data visualization
- **jsPDF** for PDF generation
- **Modern CSS** with responsive design
- **HTML5** with semantic markup

### **File Processing Libraries**
- **xlsx**: Excel file reading/writing
- **papaparse**: CSV parsing and generation
- **multer**: File upload middleware
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token management

## 📦 Installation

### **Prerequisites**
- Node.js (v14 or higher)
- npm or yarn

### **Quick Start**

1. **Clone the repository**
```bash
git clone https://github.com/sujalpathak05/excel1.git
cd excel1
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Access the application**
Open your browser and navigate to: `http://localhost:5000`

## 🎯 Usage Guide

### **1. Authentication**
- **Login**: Use the demo account (Username: `admin`, Password: `admin123`)
- **Register**: Create a new account for personalized features

### **2. Upload Files**
- Drag & drop your Excel/CSV file or click to browse
- Supported formats: `.xlsx`, `.xls`, `.csv`
- View data preview and statistics

### **3. Data Operations**
- Select operations from the available panels:
  - **Remove Duplicates**: Choose columns to check
  - **Clean Text**: Trim spaces and clean data
  - **Transform Text**: Change case to upper/lower
  - **Find & Replace**: Replace text patterns
  - **Filter Data**: Apply conditions to filter rows
  - **Sort Data**: Order by columns
- Operations are queued and can be processed in batch

### **4. Analytics**
- **Summary Tab**: Generate comprehensive data statistics
- **Pivot Tab**: Create dynamic pivot tables
- **Charts Tab**: Visualize data with interactive charts

### **5. Export Data**
- Export processed data as CSV or Excel
- Generate PDF reports with data summary
- Download files directly to your device

### **6. Templates**
- Save frequently used operation sequences
- Load saved templates for quick processing
- Share templates across sessions

## 📁 Project Structure

```
excel-automation-app/
├── index.js                 # Main server file
├── public/
│   ├── index.html           # Frontend HTML
│   └── app.js              # Frontend JavaScript
├── uploads/                 # File upload directory
├── excel_automation.db     # SQLite database
├── package.json            # Dependencies
└── README.md               # Documentation
```

## 🔧 Configuration

### **Environment Variables**
- **PORT**: Server port (default: 5000)
- **JWT_SECRET**: JWT signing secret (change in production)
- **DATABASE_PATH**: SQLite database path

### **File Upload Limits**
- Maximum file size: 10MB (configurable)
- Allowed formats: .xlsx, .xls, .csv
- Upload directory: `./uploads`

### **Database Schema**
- **users**: User accounts and authentication
- **templates**: Saved operation templates
- **jobs**: Scheduled automation jobs (future feature)

## 🚀 Deployment

### **Uplakshy Platform Deployment**
1. Import the project to your preferred hosting platform
2. Install dependencies automatically
3. Configure environment variables
4. Run the application

### **Production Considerations**
- Change JWT_SECRET to a secure random string
- Configure proper database backup
- Set up HTTPS with SSL certificates
- Configure file upload limits
- Enable logging and monitoring

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **File Validation**: Strict file type and size validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### **File Operations**
- `POST /api/upload` - Upload and parse files
- `POST /api/process` - Process data operations
- `POST /api/export` - Export processed data

### **Analytics**
- `POST /api/analytics` - Generate analytics data

### **Templates**
- `GET /api/templates` - Get user templates
- `POST /api/templates` - Save new template

### **Downloads**
- `GET /api/download/:filename` - Download files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🐛 Troubleshooting

### **Common Issues**

**File Upload Fails**
- Check file format (.xlsx, .xls, .csv only)
- Verify file size (under 10MB)
- Ensure stable internet connection

**Login Issues**
- Use demo account: admin/admin123
- Clear browser cache and cookies
- Check network connectivity

**Data Processing Errors**
- Verify data format consistency
- Check for empty columns
- Ensure numeric data for calculations

**Export Problems**
- Login required for export functions
- Check browser pop-up settings
- Verify sufficient storage space

### **Support**
For issues and questions:
1. Check this documentation
2. Review error messages in browser console
3. Verify network connectivity
4. Try refreshing the application

## 🌟 Features Roadmap

- **Database Integration**: MySQL/PostgreSQL support
- **API Connections**: REST API data fetching
- **Google Sheets**: Import/export integration
- **Scheduling**: Automated recurring jobs
- **Email Notifications**: Job completion alerts
- **Advanced Charts**: More visualization options
- **Collaboration**: Multi-user features
- **Version History**: Data change tracking

---

**Built with ❤️ by Uplakshy Pathak for Excel automation enthusiasts!**
