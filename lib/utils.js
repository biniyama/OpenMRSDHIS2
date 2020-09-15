'use strict'
const URL = require('url')
const date = require('date-and-time');

exports.entryIndexes = function(type) {
  
  let indexes 
  if(type == "msh") {
    indexes = {"orgUnit": 3, "receiving_laboratory": 5, "created": 6}
  } else if(type == "pid") {
    indexes = {"suspect_id": 2, "name": 5, "date_of_birth": 7, "sex": 8, "address": 11, "phone_local": 13}
  } else if(type == "pv1") {
    indexes = {"physician": 7}
  } else if(type == "obr") {
    indexes = {"specimen_id": 3, "observation_battery": 4, "specimen_collection_time": 7, "physician": 16, "specimen_collection_time": 24}
  } else if(type == "obx") {
    indexes = {"test_result": 5, "time_result_issued": 14}
  }
  
  return indexes
     
}

exports.nameInitial = function(name) {

  let initialChar 
  
  if(name != "") {
    initialChar = name.charAt(0);
  } else {
    initialChar = "";
  }

  return initialChar
     
}

exports.sexInitial = function(name) {

  let initialChar 
  
  if(name != "") {
    initialChar = name.charAt(0);
  } else {
    initialChar = "N";
  }

  return initialChar
     
}

exports.adaptSourceTable = function(sourceTable) {

  if(sourceTable == "UPIN Number") {
    return "U"
  } else if(sourceTable == "Provider Number") {
    return "P"
  } else if(sourceTable == "NPI Number") {
    return "N"
  } else if(sourceTable == "Local") {
    return "L"
  } else {
    return "NA"
  }
     
}

exports.adaptOrderControl = function(oc) {
  
  let orderControl = "NA"

  if(oc == "New") {
    orderControl = "NW"
  }
     
  return orderControl
}

exports.formatPhone = function(phone) {
  
  let newPhone = phone.replace("(", "").replace(")", "").replace("-", "")
     
  return newPhone
}

exports.adaptPhone = function(phone) {
  
  let newPhone

  phone = (phone.startsWith("+251") ? phone.substr(4) : phone)
  phone = (phone.startsWith("251") ? phone.substr(3) : phone)
  phone = (phone.startsWith("0") ? phone.substr(1) : phone).trim()

  newPhone = "(0" + phone.substr(0,2) + ")" + phone.substr(2,3) + "-" + phone.substr(5,4)
     
  return newPhone
}

exports.adaptDate = function(datetime) {
  let datePart, dateTimeArray, datePartArray
  
  dateTimeArray = datetime.split("T")
  datePart = dateTimeArray[0]
  datePartArray = datePart.split("-")
   
  return (datePartArray[0] + datePartArray[1] + datePartArray[2])
}

/* exports.formatDateTime = function(datetime) {
  let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2) + " " + 
              datetime.substr(8, 2) + ":" + datetime.substr(10)
  let dateValue = new Date(value)
  let formattedValue = date.format(dateValue, 'YYYY-MM-DD HH:mm:ssZ')

  return formattedValue
}

exports.formatDate = function(datetime) {
  let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2)
  let dateValue = new Date(value)
  let formattedValue = date.format(dateValue, 'YYYY-MM-DD')

  return formattedValue
}*/

exports.formatDateTime = function(datetime) {
  let formattedValue = ""
  if(datetime.trim() != "") {
    let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2) + " " + 
              datetime.substr(8, 2) + ":" + datetime.substr(10)
    let dateValue = new Date(value)
    formattedValue = date.format(dateValue, 'YYYY-MM-DD HH:mm:ssZ')
  }
  return formattedValue
}

exports.formatDate = function(datetime) {
  let formattedValue = ""
  if(datetime != "") {
    let value = datetime.substr(0, 4) + "-" + datetime.substr(4, 2) + "-" + datetime.substr(6, 2)
    let dateValue = new Date(value)
    formattedValue = date.format(dateValue, 'YYYY-MM-DD')
  }
  return formattedValue
}



exports.adaptDateTime = function(datetime) {
  let datePart, timePart, dateTimeArray, datePartArray, timePartArray
  
  dateTimeArray = datetime.split("T")
  datePart = dateTimeArray[0]
  datePartArray = datePart.split("-")
  timePart = dateTimeArray[1]
  timePartArray = timePart.split(":")

  
  return (datePartArray[0] + datePartArray[1] + datePartArray[2] + timePartArray[0] + timePartArray[1])
}

exports.doencodeDHIS2 = function() {
  const encode = require('nodejs-base64-encode');
  var username = "admin";
  var password = "district";
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
