
# Excel Automation Web App

A complete full-stack web application for Excel file automation with advanced data processing, visualization, and export capabilities.

## 🚀 Features

### File Management
- ✅ Upload Excel files (.xlsx, .xls) and CSV files
- ✅ Drag & drop file upload interface
- ✅ File history and management
- ✅ Real-time data preview

### Data Processing & Cleaning
- ✅ Remove duplicate rows
- ✅ Trim whitespace and remove special characters
- ✅ Change text case (uppercase/lowercase)
- ✅ Find and replace text
- ✅ Filter data with multiple operators
- ✅ Sort data by columns
- ✅ Data validation and formatting

### Advanced Analysis
- ✅ Generate pivot tables
- ✅ Group and aggregate data (sum, average, count, min, max)
- ✅ Conditional formatting
- ✅ Statistical analysis

### Visualization
- ✅ Interactive charts (Bar, Line, Pie)
- ✅ Real-time chart generation
- ✅ Export charts as images

### Export Options
- ✅ Export to Excel (.xlsx)
- ✅ Export to CSV
- ✅ Export to PDF
- ✅ Bulk export functionality

### Automation Features
- ✅ Save operation templates
- ✅ Reusable workflows
- ✅ Batch processing
- ✅ Operation history

### User Management
- ✅ User registration and authentication
- ✅ JWT-based security
- ✅ Role-based access control
- ✅ User file isolation

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data persistence
- **JWT** for authentication
- **Multer** for file uploads
- **XLSX** for Excel file processing
- **Papa Parse** for CSV processing

### Frontend
- **Vanilla JavaScript** with modern ES6+
- **Tailwind CSS** for responsive design
- **Chart.js** for data visualization
- **Font Awesome** for icons

## 📦 Installation

1. **Clone or download the project files**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   Or click the "Run" button in Replit.

4. **Access the application:**
   - Open your browser and navigate to the preview URL
   - For local development: `http://localhost:5000`

## 🎯 Usage Guide

### Getting Started

1. **Register/Login:**
   - Create a new account or login with existing credentials
   - All user data is isolated and secure

2. **Upload Files:**
   - Click the upload area or drag & drop files
   - Supported formats: .xlsx, .xls, .csv
   - Files are instantly parsed and previewed

### Data Operations

3. **Data Cleaning:**
   - **Remove Duplicates:** Eliminate duplicate rows
   - **Trim Spaces:** Clean whitespace from text
   - **Change Case:** Convert text to upper/lowercase
   - **Find & Replace:** Replace text patterns
   - **Filter Data:** Filter rows based on conditions
   - **Sort Data:** Sort by any column

4. **Advanced Analysis:**
   - **Pivot Tables:** Create dynamic pivot tables
   - **Aggregation:** Calculate sums, averages, counts

5. **Visualization:**
   - Generate bar, line, and pie charts
   - Interactive chart controls
   - Export charts as images

6. **Export Options:**
   - Export processed data to Excel, CSV, or PDF
   - Maintain formatting and structure

### Automation Features

7. **Templates:**
   - Save frequently used operation sequences
   - Apply templates to new files
   - Template library management

8. **File Management:**
   - View upload history
   - Access previously processed files
   - Organized file library

## 📊 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login

### File Operations
- `POST /api/upload` - Upload Excel/CSV files
- `GET /api/files` - Get user's file history

### Data Processing
- `POST /api/transform` - Apply data transformations
- `POST /api/pivot` - Generate pivot tables
- `POST /api/export` - Export processed data

### Templates
- `POST /api/templates` - Save operation templates
- `GET /api/templates` - Get user's templates

### External Integrations
- `POST /api/fetch-external` - Fetch data from APIs
- `POST /api/schedule` - Schedule recurring jobs

## 🔧 Configuration

### Environment Variables
Create a `.env` file for production:
```
JWT_SECRET=your-secret-key-here
DATABASE_URL=sqlite:excel_automation.db
PORT=5000
```

### Database
The app uses SQLite for simplicity. For production, consider:
- PostgreSQL
- MySQL
- MongoDB

## 🚀 Deployment

### Replit Deployment
1. Click "Deploy" in Replit
2. Your app will be available at the generated URL
3. All dependencies are automatically installed

### Manual Deployment
1. Set environment variables
2. Install dependencies: `npm install`
3. Start the server: `node index.js`

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- File type validation
- User data isolation
- SQL injection prevention
- XSS protection

## 🎨 UI/UX Features

- Responsive design for all devices
- Drag & drop file uploads
- Real-time data preview
- Interactive charts
- Modal dialogs for operations
- Progress indicators
- Error handling and user feedback

## 📈 Performance

- Efficient file processing
- Streaming for large datasets
- Client-side data caching
- Optimized database queries
- Compressed assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use for personal and commercial projects.

## 🆘 Support

For issues or questions:
1. Check the browser console for errors
2. Verify file formats are supported
3. Ensure stable internet connection
4. Contact support with specific error messages

## 🎯 Roadmap

Future enhancements:
- [ ] Google Sheets integration
- [ ] Database connectivity (MySQL, PostgreSQL)
- [ ] Advanced scheduling system
- [ ] Email notifications
- [ ] Macro/script support
- [ ] Multi-language support
- [ ] Advanced chart types
- [ ] Real-time collaboration

---

**Excel Automation Web App** - Transform your data processing workflow with powerful automation tools!
