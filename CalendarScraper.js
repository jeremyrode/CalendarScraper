#!/usr/bin/node
'use strict';
const fs = require('fs');
const {google} = require('googleapis');
//Below needs to point to a json file with the API key and Calendar ID
const API_KEY_PATH = '/home/pi/google_api_key.json';
/*The Google calendar needs to be pubiclly readable, this avoids using OAuth2
which is impossible to do with a nonpubically accessable device as Google
has eliminated the offline OAuth2 method of getting a refresh token */
const SCOPES = ['https://www.googleapis.com/auth/calendar.events.public.readonly'];
const UPDATE_INTERVAL = 30; //How often to poll Goolge canlendar In mins
const INTERVAL_OVERLAP = 1; //In mins to be sure we don't miss anything
const MAX_API_ERRORS = 10; // how many API requests to retry if errors
const API_RETRY_DELAY = 1; //how long in mins to wait between API retries
//Globals
let pendingCommands = null; //Mutex for pending unexecuted commands
let errorsInAPI = 0; //Counter to limit requests to Google
// Load API Key & Cal ID from a local json file
fs.readFile(API_KEY_PATH, (err, content) => {
  if (err) return logWithTime('Error loading API key file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  const obj = JSON.parse(content);
  planEvents(obj.api_key, obj.google_cal_id); //Do a plan now
  setInterval(planEvents, UPDATE_INTERVAL*60000, obj.api_key,obj.google_cal_id); //Replan
  logWithTime('Program Sucessfully Started');
});
//Plan out the current interval
function planEvents(api_key, google_cal_id) {
  const calendar = google.calendar({version: 'v3', auth: api_key});
  const planStartDate = new Date;
  planStartDate.setSeconds(planStartDate.getSeconds() + 10); //Give us a ten sec delay for causality
  const planEndDate = new Date(planStartDate.getTime()); //Clone current time
  planEndDate.setMinutes(planStartDate.getMinutes() + UPDATE_INTERVAL + INTERVAL_OVERLAP); // Next interval
  if (pendingCommands) { //We have planned commands pending, this happens especially if commands take time
    logWithTime('We had pending events at: ' + pendingCommands.toString());
    let delay = Math.abs(pendingCommands - Date.now())+10;
    if (delay < UPDATE_INTERVAL * 60000 ) { //if the normal update wont get next event
      setTimeout(planEvents,delay, api_key, google_cal_id); //Call ourself in the future
      logWithTime('Recall planEvents() in ' + delay + ' ms');
    }
    return; // don't plan
  }
  calendar.events.list({
    calendarId: google_cal_id,
    timeMin: planStartDate.toISOString(),
    timeMax: planEndDate.toISOString(),
    maxResults: 10, //Change this for a busy calendar
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) {
      logWithTime('The Google API request returned an error: ' + err);
      errorsInAPI += 1;
      logWithTime('We have ' + errorsInAPI + ' errors in a row');
      if (errorsInAPI < MAX_API_ERRORS) { //Limit request retries
        setTimeout(planEvents,API_RETRY_DELAY * 60000,api_key,google_cal_id); //Call ourself in the future
        logWithTime('Recall planEvents() in one min');
      }
      else {
        logWithTime('We gave up on this planning interval due to excess retries');
      }
      return; //we didn't get an event, so giveup
    }
    errorsInAPI = 0; //Got a good API request, so reset error counter
    for (let event of res.data.items) { //unpack mutiple events
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      if ( eventStart >= planStartDate ) { //Do something for an event start
        setTimeout(logWithTime,eventStart - Date.now(), 'Event Named: ' + event.summary + ' begins');
        /* Below is the mutex functionality if a calender even triggers a complex chain
        of events that takes time and you don't want mutlple events colliding
        it's not necissary when the events trigger something quick   */
        pendingCommands = new Date(eventStart - Date.now()); //keep track of when the last event is expected to end
        setTimeout(clear_commands,eventStart - Date.now()); //clear the mutex when commands are done
      }
      if ( eventEnd <= planEndDate ) { //Do something for an end
        setTimeout(logWithTime,eventEnd - Date.now(), 'Event Named: ' + event.summary + ' ends');
        pendingCommands = new Date(eventEnd - Date.now()); //keep track of when the last event is expected to end
        setTimeout(clear_commands,eventEnd - Date.now()); //clear the mutex when commands are done
      }
    }
  });
}
function clear_commands() { //clears our mutex
  pendingCommands = null;
}
//log the time with millisecons to verify time
function logWithTime(message) {
  const curDate = new Date();
  console.log(curDate.toLocaleString('en-GB') + ':' + curDate.getMilliseconds() + ': ' + message);
}
