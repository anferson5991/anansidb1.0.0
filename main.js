const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require('node:path');
const mysql = require('mysql');
const {Database} = require('sqlite3').verbose();
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let window;
let isScriptRunning = false;

function createWindow(file) {
  window = new BrowserWindow({
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#003366',
      symbolColor: '#4CAF50'
    },
    frame: false,
    width: 800,
    height: 600,
    minWidth: 400, 
    minHeight: 300,
    webPreferences: {
      backgroundColor: '#003366',
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: true,
      worldSafeExecuteJavaScript: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  window.setMenuBarVisibility(false);
  window.loadFile(file);
  console.log('Window created for file:', file);

  window.on('closed', () => {
    window = null;
  });

  ipcMain.on('registerUser', (event, registerData) => {
    console.log('Received data to register user:', registerData);
    registerUser(registerData);
  });

  ipcMain.on('loginUser', (event, loginData) => {
    console.log('Received data to login user:', loginData);
    loginUser(loginData);
  });

  ipcMain.on('saveAndExecute', (event, data) => {
    console.log('Received data to save to SQLite and execute the Python script:', data);
    saveToSQLiteAndExecuteScript(data);
  });
}

function getDatabasePath() {
  return isDev
      ? path.join(__dirname, 'resources', 'anansi.db') // Caminho em desenvolvimento
      : path.join(process.resourcesPath, 'anansi.db');  // Caminho em produção
}

function getExecutablePath() {
  return isDev
      ? path.join(__dirname, 'resources', 'anansi.exe') // Caminho em desenvolvimento
      : path.join(process.resourcesPath, 'anansi.exe'); // Caminho em produção
}


function performUserInsertion(connection, registerData) {
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
  const values = [registerData.username, registerData.password];
  connection.query(sql, values, (error, results, fields) => {
    if (error) {
      console.error('Error registering user:', error.message);
    } else {
      console.log('User', registerData.username, 'registered successfully!');
    }
    connection.end();
  });
}

function saveToSQLiteAndExecuteScript(data) {
  console.log('Initiating the operation to save to SQLite...');

  // Caminho para o anansi.db, diferente para desenvolvimento e produção.
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  
  db.run('CREATE TABLE IF NOT EXISTS anansi (rowid INTEGER PRIMARY KEY, link TEXT)');
  const stmt = db.prepare('INSERT OR REPLACE INTO anansi (rowid, link) VALUES (1, ?)');
  stmt.run(data, function (err) {
    if (err) {
      console.error('Error inserting/updating data in SQLite:', err.message);
    } else {
      console.log('Data inserted/updated into SQLite successfully!');
    }
    stmt.finalize();
    db.close();
    if (!isScriptRunning) {
      executePythonScript();
      isScriptRunning = true;
    }
  });
}

async function executePythonScript() {
  console.log('Executing the Python script...');
  
  const executablePath = getExecutablePath();
  
  try {
      const processResult = spawn(executablePath, [], { encoding: 'utf8' });
      processResult.stdout.on('data', (data) => {
          console.log(`stdout: ${data}`);
      });
      processResult.stderr.on('data', (data) => {
          console.error(`stderr: ${data}`);
      });
      processResult.on('close', (code) => {
          console.log(`child process exited with code ${code}`);
          isScriptRunning = false;
          window.webContents.send('scriptExecuted');
      });
  } catch (error) {
      console.error('Error in executePythonScript:', error);
      isScriptRunning = false;
  }
}


function saveUser(username) {
  // Caminho para o anansi.db, diferente para desenvolvimento e produção.
  const dbPath = getDatabasePath();

  const db = new Database(dbPath);
  db.run('CREATE TABLE IF NOT EXISTS userHistory (rowid INTEGER PRIMARY KEY, username TEXT, link TEXT)');
  const stmt = db.prepare('INSERT OR REPLACE INTO userHistory (username) VALUES (?)');
  stmt.run(username, function (err) {
    if (err) {
      console.error('Error inserting/updating data in SQLite:', err.message);
    } else {
      console.log('Data inserted/updated into SQLite successfully!');
    }
    stmt.finalize();
    db.close();
  });
}

function loginUser(loginData) {
  console.log('Attempting to login user with data:', loginData);
  const connection = mysql.createConnection({
    host: 'anansiserver.cnfvm83a7lds.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '!Anansidb5991zeagtluke',
    port: 3306,
    database: 'anansidb',
  });
  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err.message);
      return;
    }
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    const values = [loginData.username, loginData.password];
    connection.query(sql, values, (error, results, fields) => {
      if (error) {
        console.error('Error logging in user:', error.message);
      } else {
        if (results.length > 0) {
          console.log('User ', loginData.username,' logged in successfully!');
          window.loadFile('index.html');
        } else {
          console.log('Invalid username or password.');
          window.webContents.send('loginResult', { success: false, message: 'User does not exist. Check and click here again or click in Register to create!' });
        }
      }
      connection.end();
      saveUser(loginData.username);
    });
  });
}

function registerUser(registerData) {
  console.log('Attempting to register user with data:', registerData);

  if (!validateEmail(registerData.username)) {
    console.error('Invalid email address.');
    return;
  }
  if (!validatePassword(registerData.password)) {
    console.error('Password must be at least 8 characters long and include a number and an uppercase letter.');
    return;
  }

  const connection = mysql.createConnection({
    host: 'anansiserver.cnfvm83a7lds.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: '!Anansidb5991zeagtluke',
    port: 3306,
    database: 'anansidb',
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err.message);
      return;
    }
    const checkDBExistsSQL = "SHOW DATABASES LIKE 'anansidb'";
    connection.query(checkDBExistsSQL, (checkDBError, checkDBResults) => {
      if (checkDBError) {
        console.error('Error checking if database exists:', checkDBError.message);
        connection.end();
        return;
      }
      if (checkDBResults.length === 0) {
        const createDBSQL = 'CREATE DATABASE anansidb';
        connection.query(createDBSQL, (createDBError, createDBResults) => {
          if (createDBError) {
            console.error('Error creating database:', createDBError.message);
            connection.end();
            return;
          }
          console.log('Database "anansidb" created successfully.');
          createTable(connection, registerData);
        });
      } else {
        const checkUserExistsSQL = 'SELECT * FROM users WHERE username = ?';
        const checkUserValues = [registerData.username];
        connection.query(checkUserExistsSQL, checkUserValues, (checkUserError, checkUserResults) => {
          if (checkUserError) {
            console.error('Error checking if user exists:', checkUserError.message);
            connection.end();
            return;
          }
          if (checkUserResults.length > 0) {
            console.log('User ', registerData.username, ' already exists!');
            loginUser(registerData);
          } else {
            performUserInsertion(connection, registerData);
            loginUser(registerData);
          }
        });
      }
    });
  });
}

// Funções auxiliares para validação
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return regex.test(password);
}

app.on('ready', () => {
  createWindow('login.html');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});