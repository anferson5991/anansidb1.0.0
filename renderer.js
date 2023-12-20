// renderer.js
document.addEventListener('DOMContentLoaded', () => {
  const currentPagePath = window.location.pathname; 
  const currentPage = currentPagePath.substring(currentPagePath.lastIndexOf('/') + 1);
  console.log(currentPage);

  if (currentPage === 'login.html') {
    // Lógica específica para o login.html
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    
    if (loginButton && registerButton) {
      console.log('Login and Register buttons found.');
      
      loginButton.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        electronAPI.sendToMain('loginUser', { username, password });
        console.log('Attempting login with username:', username);
      });

      registerButton.addEventListener('click', () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        electronAPI.sendToMain('registerUser', { username, password });
        console.log('Attempting registration with username:', username);
      });
    } else {
      console.error('Login and Register buttons not found.');
      alert('Restart the application!');
    }
  } else if (currentPage === 'index.html') {
    // Lógica específica para o index.html
    const textInput = document.getElementById('textInput');
    const saveAndExecuteButton = document.getElementById('saveAndExecute');
    const output = document.getElementById('output');
    output.textContent = 'Copy the app link above';

    saveAndExecuteButton.addEventListener('mouseup', () => {
      const inputData = textInput.value;
      output.textContent = 'Executing';
      console.log('Save and execute button pressed.');
      electronAPI.sendToMain('saveAndExecute', inputData);
    });

    electronAPI.receive('scriptExecuted', () => {
      output.textContent = 'Executed. Lets try another one?';
    });
    }
    else {
      console.log('HTML not recognized.');
    }
});
