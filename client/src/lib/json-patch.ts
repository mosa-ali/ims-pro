/**
 * Global JSON.parse patch to handle MySQL date strings
 * 
 * This patches JSON.parse to automatically convert ISO date strings
 * back to Date objects when deserializing from the server.
 */

const originalParse = JSON.parse;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

JSON.parse = function(text: string, reviver?: (key: string, value: any) => any): any {
 const safeReviver = (key: string, value: any) => {
 // Check if value is a string that looks like an ISO date
 if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
 const date = new Date(value);
 // Only convert if it's a valid date
 if (!isNaN(date.getTime())) {
 return date;
 }
 }
 
 // If a custom reviver was provided, call it
 if (typeof reviver === 'function') {
 return reviver(key, value);
 }
 
 return value;
 };
 
 return originalParse.call(this, text, safeReviver);
};

console.log('[JSON Patch] Client-side JSON.parse patched to handle date strings');
