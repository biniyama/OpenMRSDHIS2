#!/usr/bin/env node
'use strict'

const express = require('express')
const medUtils = require('openhim-mediator-utils')
const winston = require('winston')
const utils = require('./utils')
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

// Logging setup
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {level: 'info', timestamp: true, colorize: true})

// Config
let config = {} // this will vary depending on whats set in openhim-core
const apiConf = process.env.NODE_ENV === 'test' ? require('../config/test') : require('../config/config')
const mediatorConfig = require('../config/mediator')

let port = process.env.NODE_ENV === 'test' ? 7001 : mediatorConfig.endpoints[0].port

/**
 * setupApp - configures the http server for this mediator
 *
 * @return {express.App}  the configured http server
 */
function setupApp () {
  const app = express()
  app.use(bodyParser.json())
  
  app.post('/send', async (req, res) => {
    winston.info("Processing " + req.method + " request on " + req.url)
    winston.info("Body posted: \n")
    console.log(req.body)

    const headers = { 'content-type': 'application/json' }

    let orchestrations = []

    var session = '/session'
    var location_query = '/location?q=' + mediatorConfig.config.SampleLocation
    var visit = '/visit'
    var patient = '/patient'

    var encodedOpenMRS = utils.doencodeOpenMRS()
    var encodedDHIS2 = utils.doencodeDHIS2()
    
    try {
      //order = req.body
      let session_data

      try{
        session_data = await fetch(mediatorConfig.config.OpenMRSURL + session , {
          method: "GET",
          headers: {
            "Authorization":"Basic " + encodedOpenMRS
          }
        });
      } catch (err) {
        session_data = err.message
        //const headers = { 'content-type': 'application/text' }
        console.log(session_data)

        // set content type header so that OpenHIM knows how to handle the response
        //res.set('Content-Type', 'application/json+openhim')
  
        // construct return object
        //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, mfrCollectionsResponseBody, 
        //          orchestrations, properties))
        res.send(session_data)
      }

      let session_detail = await session_data.json()

      if(session_detail.authenticated) {
        var session_id = session_detail.sessionId
        let location_data
        try{
          location_data = await fetch(mediatorConfig.config.OpenMRSURL + location_query , {
            method: "GET",
            headers: {
              "Cookie":"JSESSIONID=" + session_id
            }
          });
        } catch (err) {
          location_data = err.message
          //const headers = { 'content-type': 'application/text' }
          console.log(location_data)
  
          // set content type header so that OpenHIM knows how to handle the response
          //res.set('Content-Type', 'application/json+openhim')
    
          // construct return object
          //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, mfrCollectionsResponseBody, 
          //          orchestrations, properties))
          res.send(location_data)
        }
        let location_detail = await location_data.json()
        console.log(location_detail);
        
        //for(var loc of location_detail.results) {
        var loc = location_detail.results[0]

        let visit_data
        let startIndex = 0
        //let total_count = 0
        let has_next = true
        let increment = 50
        
        var visit_info = []
        while(has_next) {
            try{
                visit_data = await fetch(mediatorConfig.config.OpenMRSURL + visit + "?location=" +  loc.uuid + 
                                        "&fromStartDate=" + mediatorConfig.config.StartDate + "&startIndex=" + startIndex, {
                method: "GET",
                headers: {
                    "Cookie":"JSESSIONID=" + session_id
                }
                });
            } catch (err) {
                visit_data = err.message
                //const headers = { 'content-type': 'application/text' }
                console.log(visit_data)
        
                // set content type header so that OpenHIM knows how to handle the response
                //res.set('Content-Type', 'application/json+openhim')
        
                // construct return object
                //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, mfrCollectionsResponseBody, 
                //          orchestrations, properties))
                res.send(visit_data)
            }
            let visit_detail = await visit_data.json()
            for(var v of visit_detail.results) {
                console.log("\n**********Visit: " + JSON.stringify(v) + "************\n")
                //Fetch detail of each visit
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////
                try{
                    var visit_uuid = await fetch(v.links[0].uri.replace("http", "https"), {
                    method: "GET",
                    headers: {
                        "Cookie":"JSESSIONID=" + session_id
                    }
                    });
                } catch (err) {
                    var visit_uui_err = err.message
                    //const headers = { 'content-type': 'application/text' }
                    console.log(visit_uui_err)
            
                    // set content type header so that OpenHIM knows how to handle the response
                    //res.set('Content-Type', 'application/json+openhim')
            
                    // construct return object
                    //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, mfrCollectionsResponseBody, 
                    //          orchestrations, properties))
                    res.send(visit_uui_err)
                }
                let visit_uuid_detail = await visit_uuid.json()

                var visit_type = visit_uuid_detail.visitType.display
                var start_date = visit_uuid_detail.startDatetime
                var stop_date = visit_uuid_detail.stopDatetime
                var admission_date = ""
                var discharge_date = ""
                
                var new_patient_visit = "No"
                for(var encounter of visit_uuid_detail.encounters) {
                    var display = encounter.display.split(" ")
                    if(display[0].trim() == "ADMISSION") admission_date = display[1]
                    else if(display[0].trim() == "DISCHARGE") discharge_date = display[1]
                    else if(display[0].trim() == "REG") new_patient_visit = "Yes"
                }

                var admission_status = ""
                var visit_status = ""
                for(var att of visit_uuid_detail.attributes) {
                    var att_display = att.display.split(":")
                    if(att_display[0].trim() == "Admission Status") admission_status = att_display[1].trim()
                    else if(att_display[0].trim() == "Visit Status") visit_status = att_display[1].trim()
                }

                //Fetch patient detail
                /////////////////////////////////////////////////////////////////////////////////////////////////////////////
                try{
                    var patient_uuid = await fetch(visit_uuid_detail.patient.links[0].uri.replace("http", "https"), {
                    method: "GET",
                    headers: {
                        "Cookie":"JSESSIONID=" + session_id
                    }
                    });
                } catch (err) {
                    var patient_uui_err = err.message
                    //const headers = { 'content-type': 'application/text' }
                    console.log(patient_uui_err)
            
                    // set content type header so that OpenHIM knows how to handle the response
                    //res.set('Content-Type', 'application/json+openhim')
            
                    // construct return object
                    //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, mfrCollectionsResponseBody, 
                    //          orchestrations, properties))
                    res.send(patient_uui_err)
                }
                let patient_uuid_detail = await patient_uuid.json()

                var patient_name = patient_uuid_detail.person.display
                var age = patient_uuid_detail.person.age
                var gender = patient_uuid_detail.person.gender
                var birthdate = patient_uuid_detail.person.birthdate
                var patient_class = patient_uuid_detail.person.attributes[0].display
                var address = patient_uuid_detail.person.preferredAddress
                var ID = patient_uuid_detail.identifiers[0].display.split("=")
                var patient_id = ID[1].trim()
                //////////////////////////////////////////////////////////////////////////////////////////////////////////

                visit_info.push(
                    {
                        "Patient Name": patient_name,
                        "Age": age,
                        "Birthdate": birthdate,
                        "Gender": gender,
                        "Visit Type": visit_type,
                        "Date Started": start_date,
                        "Date Stopped": stop_date,
                        "Date of Admission": admission_date,
                        "Date of Discharge": discharge_date,
                        "New Patient Visit": new_patient_visit,
                        "Class": patient_class,
                        "Visit Status": visit_status,
                        "Admission Status": admission_status,
                        "Patient ID": patient_id
                    }
                );

            }

            //total_count += visit_detail.results.length
            if(visit_detail.links !== undefined && visit_detail.links[0]["rel"] == "next") {
                startIndex += increment
            } else {
                has_next = false
            }
        }
        console.log("\n\n*****************************************************************\n")
        console.log(JSON.stringify(visit_info))
        console.log("\n*****************************************************************\n")
        //}
        res.set('Content-Type', 'application/json')
        res.send(visit_info)  
      }
      //console.log(session_data)

      //res.send(session_data)
      //let responses = '{"success": ' + result_array + ', "failed": ' + error_suspect_id + '}'

      //let responseBody = JSON.stringify(responses)
      // set content type header so that OpenHIM knows how to handle the response
      //res.set('Content-Type', 'application/json+openhim')

      // construct return object
      //var properties = { property: 'Order Route' }
      //res.send(utils.buildReturnObject(mediatorConfig.urn, "SUCCESS", 200, headers, responseBody, 
      //                          orchestrations, properties))
       
    } catch (err) {
      let order_data = err.message
      //const headers = { 'content-type': 'application/text' }
      //var properties = { 'property': 'Order Route' }
      // set content type header so that OpenHIM knows how to handle the response
      //res.set('Content-Type', 'application/json+openhim')

      // construct return object
      //res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, order_data, 
      //            orchestrations, properties))
      winston.info(order_data)
      res.send(order_data)
      //return 
    }

  })

return app
}

/**
 * start - starts the mediator
 *
 * @param  {Function} callback a node style callback that is called once the
 * server is started
 */
function start (callback) {
  if (apiConf.api.trustSelfSigned) { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' }

  if (apiConf.register) {
    medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
      if (err) {
        winston.error('Failed to register this mediator, check your config')
        winston.error(err.stack)
        process.exit(1)
      }
      apiConf.api.urn = mediatorConfig.urn
      medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
        winston.info('Received initial config:')
        winston.info(JSON.stringify(newConfig))
        config = newConfig
        if (err) {
          winston.error('Failed to fetch initial config')
          winston.error(err.stack)
          process.exit(1)
        } else {
          winston.info('Successfully registered mediator!')
          let app = setupApp()
          const server = app.listen(port, () => {
            if (apiConf.heartbeat) {
              let configEmitter = medUtils.activateHeartbeat(apiConf.api)
              configEmitter.on('config', (newConfig) => {
                winston.info('Received updated config:')
                winston.info(JSON.stringify(newConfig))
                // set new config for mediator
                config = newConfig

                // we can act on the new config received from the OpenHIM here
                winston.info(config)
              })
            }
            callback(server)
          })
        }
      })
    })
  } else {
    // default to config from mediator registration
    config = mediatorConfig.config
    let app = setupApp()
    const server = app.listen(port, () => callback(server))
  }
}
exports.start = start

if (!module.parent) {
  // if this script is run directly, start the server
  start(() => winston.info(`Listening on ${port}...`))

}
