'use strict'
const URL = require('url')
const date = require('date-and-time');

exports.doencodeDHIS2 = function() {
  const encode = require('nodejs-base64-encode');
  var username = "admin";
  var password = "X7$8CFkUZ@";
  var tobeencoded = username + ":" + password;
  return encode.encode(tobeencoded, 'base64');
}

exports.doencodeOpenMRS = function() {
  const encode = require('nodejs-base64-encode');
  var username = "admin";
  var password = "Admin123";
  var tobeencoded = username + ":" + password;
  return encode.encode(tobeencoded, 'base64');
}

exports.buildOrchestration = (name, beforeTimestamp, method, url, requestHeaders, requestContent, res, body) => {
  let uri = URL.parse(url)
  return {
    name: name,
    request: {
      method: method,
      headers: requestHeaders,
      body: requestContent,
      timestamp: beforeTimestamp,
      path: uri.path,
      querystring: uri.query
    },
    response: {
      status: res.statusCode,
      headers: res.headers,
      body: body,
      timestamp: new Date()
    }
  }
}

exports.buildReturnObject = (urn, status, statusCode, headers, responseBody, orchestrations, properties) => {
  var response = {
    status: statusCode,
    headers: headers,
    body: responseBody,
    timestamp: new Date().getTime()
  }
  return {
    'x-mediator-urn': urn,
    status: status,
    response: response,
    orchestrations: orchestrations,
    properties: properties
  }
}
