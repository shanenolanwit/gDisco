const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const inquirer = require('inquirer')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Gmail API.
  askQuestions(content);
});

function askQuestions(content) {
  var answer = '';
  console.log("listLabels (ll)");
  console.log("countEmails (ce)");
  console.log("search (s)");
  console.log("quit (q)");
  var questions = [{
    type: 'input',
    name: 'name',
    message: "Select an option",
  }]
  inquirer.prompt(questions).then(answers => {
    answer = answers['name'];

    if (answer == 'quit' || answer == 'q') {
      console.log("bye");
    } else if (answer == 'listLabels' || answer == 'll') {
      console.log("list labels");
      authorize(JSON.parse(content), listLabels);
    } else if (answer =='search' || answer == 's'){
      console.log("search for emails");
      authorize(JSON.parse(content), findEmail);      
    } else if (answer =='countEmails' || answer == 'ce'){
      console.log("search for emails");
      authorize(JSON.parse(content), countEmail);      
    } else {
      console.log("Didn't understand that choice");
      askQuestions(content);
    }
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  gmail.users.labels.list({
    userId: 'me',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const labels = res.data.labels;
    if (labels.length) {
      console.log('Labels:');
      labels.forEach((label) => {
        console.log(`- ${label.name}`);
      });
    } else {
      console.log('No labels found.');
    }
  });
}

/**
 * Counts the emails in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function countEmail(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  gmail.users.getProfile({
    userId: 'me',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    console.log(`Email Address - ${res.data.emailAddress}`);
    console.log(`Messages Total - ${res.data.messagesTotal}`);
    console.log(`Threads Total - ${res.data.threadsTotal}`);
  });
}

/**
 * Finds the emails in the user's account matching a given query.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function findEmail(auth) {
  const gmail = google.gmail({ version: 'v1', auth });
  var query = ""
  var questions = [{
    type: 'input',
    name: 'name',
    message: "Enter your search term",
  }]
  inquirer.prompt(questions).then(answers => {
    query = answers['name'];
    gmail.users.messages.list({
      userId: 'me',
      q: query
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      if (res.data.resultSizeEstimate > 10) {
        console.log("result size is too big, please narrow your search");
      } else {
        const messages = res.data.messages;
        if (messages.length) {
          console.log('Message ID,Thread ID');
          messages.forEach((message) => {
            console.log(`${message.id},${message.threadId}`);
          });
        }
      }

    });
  });

}