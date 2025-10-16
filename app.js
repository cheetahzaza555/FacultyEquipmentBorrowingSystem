var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');

var app = express();

// เชื่อมต่อ MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/BorrowSystem');
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
};
connectDB();


// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/index'); // กำหนด layout หลักที่ใช้ร่วมกัน
app.set('view engine', 'ejs');

// Middleware ใช้งานทั่วไป
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// ========================================
// 🔑 Session Middleware
// ========================================
app.use(session({
  // *** สำคัญ: เปลี่ยน YOUR_SECRET_KEY เป็นคีย์ลับที่ซับซ้อน ***
  secret: 'YOUR_VERY_SECURE_SECRET_KEY_12345',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 ชั่วโมง
}));



// ========================================
// 🧭 Route Handlers (ต้องอยู่หลัง Session และ Flash Middleware)
// ========================================
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
