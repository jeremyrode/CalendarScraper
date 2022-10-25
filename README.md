# CalendarScraper: Perform Time-Based Action via Scraping a Google Calendar
## Backstory
Handling time and date-based events sucks.  Calendars are complicated and change, daylight savings time comes and goes.  Originally, I was developing an app to schedule my Spa heater around time-of-use (TOU) electric rates.  The TOU rates change with season, on weekends and holidays.  At first, I was using cron daemon, but it was a real pain to make exceptions or change anything.

I was thinking that the only interface I’ve ever liked is Google Calendar; so why not just use Google Calendar?  So here it is, less than 100 lines of Node.js that scrapes a Google calendar and translates the calendar events into Javascript setTimeout().  Gets the function call down to <.01 s on a Raspberry Pi W2.

## How to Use

It’s really easy to use, install Node.js and npm on your distro, then Google API Client
``` sh
$ npm install googleapis
```

Make a publically avalible Google Calendar.  It needs to be public, otherwise the API key will not work and you will have to use an OAuth2 flow, which is 100X more complicated than the API key.  Get the Calendar ID from the "Settings and Sharing" page.

Get a Google API key:
[Google API Key Docs](https://cloud.google.com/docs/authentication/api-keys)

Put the API key and the calendar ID in a .json file where the API_KEY_PATH constant points to:
```
{"api_key":"YOUR_API_KEY_HERE","google_cal_id":"YOUR_GOOGLE_CALENDAR_ID@group.calendar.google.com"}
```

That's it! Then run the program:

``` sh
$ node CalendarScraper
```
Now comes the fun part, add some actions to replace the logWithTime() example function to actually do something useful.
