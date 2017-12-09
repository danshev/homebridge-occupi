const { Pool, Client } = require('pg')
var Accessory, Service, Characteristic, UUIDGen

Room = require("./models/room.js")
Sensor = require("./models/sensor.js")
RoomSensor = require("./models/roomSensor.js")
MotionDetect = require("./models/motionDetect.js")
BarrierDetect = require("./models/barrierDetect.js")

module.pool = new Pool({
  user: 'pi',
  host: 'localhost',
  database: 'occupi_dev',
  password: 'Secure,06',
  port: 5432
})

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version)

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  UUIDGen = homebridge.hap.uuid
  
  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-occupi", "Occupi", OccupiPlatform, true)
}


// Passed to the above
function OccupiPlatform(log, config, api) {
  log("OccupiPlatform Init")
  
  platform = this
  
  this.log = log
  this.config = config
  this.sensors = this.config.sensors || []

  this.accessories = {}
  this.periodicUpdater
  this.periodicUpdaterInterval = 5 * 60 * 1000

  this.toggle = false


  this.testEvents = []

  /*
  this.requestServer = http.createServer(function(request, response) {
    
    if (request.url === "/add") {
      this.addAccessory(new Date().toISOString())
      response.writeHead(204)
      response.end()
    }

    if (request.url == "/reachability") {
      this.updateAccessoriesReachability()
      response.writeHead(204)
      response.end()
    }

    if (request.url == "/remove") {
      this.removeAccessory()
      response.writeHead(204)
      response.end()
    }
  }.bind(this))
  
  this.requestServer.listen(18081, function() {
    platform.log("Occupi Server Listening...")
  })
  */

  if (api) {
      // Save the API object as plugin needs to register new accessory via this object
      this.api = api

      // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
      // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
      // Or start discover new accessories.
      this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this))
  }
}

// Method to restore accessories from cache
OccupiPlatform.prototype.configureAccessory = function (accessory) {
  this.log('---> configureAccessory')
  this.setService(accessory)
  this.accessories[accessory.context.room_id] = accessory
}


// Method to setup accesories from config.json
OccupiPlatform.prototype.didFinishLaunching = function () {
  platform = this
  platform.log("didFinishLaunching")

  // Add (or update) sensor accessories (defined in config.json)
  for (i in this.sensors) this.addAccessory(this.sensors[i])

  // Remove extra accessories in cache
  for (room_id in this.accessories) {
    accessory = this.accessories[room_id]
    if (!accessory.reachable) this.removeAccessory(accessory)
  }

  // Setup (AKA "start") the platform's updater() function, at the platform-defined frequency
  this.periodicUpdater = setInterval(this.updater.bind(this), this.periodicUpdaterInterval)


// TEST sequence of events
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:FF:EE", "data": "in"}, "Person walks into apt Common Area and triggers barrier sensor FROM outside TO Common Area"), 120*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:AA:BB", "data": null}, "Person walks through kitchen area and triggers motion sensor"), 121*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:EE:FF", "data": "out"}, "Person triggers barrier sensor by walking FROM Common Area TO Dan's Bedroom"), 123*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:GG:HH", "data": null}, "Person walks into Dan's room and triggers motion sensor"), 123.5*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:II:JJ", "data": "in"}, "Person triggers barrier sensor by walking FROM Dan's Bedroom INTO Dan's Hallway"), 123.6*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:KK:LL", "data": "in"}, "Person triggers barrier sensor by walking FROM Dan's Hallway INTO Dan's Bathroom"), 124.5*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:KK:LL", "data": "out"}, "Person triggers barrier sensor by walking FROM Dan's Bathroom INTO Dan's Hallway"), 200*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:II:JJ", "data": "out"}, "Person triggers barrier sensor by walking FROM Dan's Hallway INTO Dan's Bedroom"), 201.1*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:GG:HH", "data": null}, "Person walks through Dan's Bedroom and triggers motion sensor"), 200.8*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:EE:FF", "data": "in"}, "Person triggers barrier sensor by walking FROM Dan's Bedroom INTO Common Area"), 201.3*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:CC:DD", "data": null}, "Person triggers Common Area motion sensor by entering Common Area (and sits)"), 201.7*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:CC:DD", "data": null}, "Person re-triggers motion sensor in Common Area due to routine motion (while sitting, etc.)"), 284*1000)
  setTimeout(this.handleBluetoothEvent.bind(this, { "address": "00:11:22:33:CC:DD", "data": null}, "Person re-triggers motion sensor in Common Area due to routine motion (while sitting, etc.)"), 322*1000)
}


OccupiPlatform.prototype.handleBluetoothEvent = function (bluetoothData, descriptionForLog) {
  platform = this
  platform.log(descriptionForLog)
  
  Sensor.findByBluetoothAddress(bluetoothData.address, (success, sensorData) => {
    if(!success) {
      platform.log('Sensor.findByBluetoothAddress ... ' + sensorData)
      return
    } else if (sensorData === undefined) {
      platform.log('no matching sensor')
      return
    }

    sensor = new Sensor(sensorData)
    sensor.rooms((success, roomData) => {
      if(!success) {
        platform.log('sensor.rooms ... ' + sensorData)
        return
      } else if (sensorData === undefined) {
        platform.log('no rooms associated with sensor')
        return
      }

      // Case: Motion Sensor
      if(sensor.get('type') === 'motion') {

        // set room's occupancy ==> true
        room = new Room(roomData[0])
        room.set('is_occupied', true)

        inRoomAccessory = platform.accessories[room.get('id')]
        inRoomAccessory.getService(Service.OccupancySensor)
          .setCharacteristic(Characteristic.OccupancyDetected, true)
        
        room.update((success, updatedRoomData) => {
          if(!success) {
            platform.log('room.update ... ' + updatedRoomData)
            return
          } else if (updatedRoomData === undefined) {
            platform.log("something went wrong updating the room's occupancy state")
            return
          }

          // log the detect
          detect = new MotionDetect({ sensor_id: sensor.get('id')})
          detect.save((success, motionDetectData) => {
            if(!success) {
              platform.log('detect.save ... ' + motionDetectData)
              return
            } else if (motionDetectData === undefined) {
              platform.log("something went wrong while logging the motionDetect")
              return
            }
          })
        })
      } 

      // Case: Barrier Sensor
      else {

        // Validate the correct setup exists (1 barrier sensor joins 2 rooms)
        if (roomData.length == 2) {

          // The sensor.rooms() query always returns data rows ordered by direction, so 'in' then 'out'
          inRoom = bluetoothData.data == 'in' ? new Room(roomData[0]) : new Room(roomData[1])
          outRoom = bluetoothData.data == 'in' ? new Room(roomData[1]) : new Room(roomData[0])

          inRoomAccessory = platform.accessories[inRoom.get('id')]

          // Log the event (in's and out's)
          BarrierDetect.log(inRoom.get('id'), outRoom.get('id'), (success, barrierDetectData) => {
            if(!success) {
              platform.log('BarrierDetect.log ... ' + barrierDetectData)
              return
            } else if (barrierDetectData === undefined) {
              platform.log("something went wrong saving the barrier detects")
              return
            }

            timeWindow = outRoom.get('is_bedroom') ? '360 min' : '120 min'

            // Get the calculated number of occupants in the 'out' room
            outRoom.getOccupancyData(timeWindow, (success, occupancyData) => {
              if(!success) {
                platform.log('outRoom.getOccupancyData ... ' + occupancyData)
                return
              } else if (occupancyData === undefined) {
                platform.log("something went wrong getting the outRoom occupancy data")
                return
              }

              // COULD ADD NUMBER OF MOTION SENSORS TO getOccupancyData()

              // IF the room doesn't have motion sensors, then the occupancyData.barrier_total value is the go-by
              outRoom.getNumberMotionSensors((success, motionSensorCount) => {
                if(!success) {
                  platform.log('outRoom.getNumberMotionSensors ... ' + motionSensorCount)
                  return
                } else if (motionSensorCount === undefined) {
                  platform.log("something went wrong getting the count of motion sensors")
                  return
                }

                if (motionSensorCount == 0) {
                  if (occupancyData.barrier_total <= 0) {
                    
                    //  Set 'out' room's occupancy ==> false
                    outRoomAccessory = platform.accessories[occupancyData.room_id]
                    outRoomAccessory.getService(Service.OccupancySensor)
                      .setCharacteristic(Characteristic.OccupancyDetected, false)

                    outRoom.set('is_occupied', false)
                    outRoom.update((success, updatedRoomData) => {
                      if(!success) {
                        platform.log('outRoom.update ... ' + updatedRoomData)
                        return
                      } else if (updatedRoomData === undefined) {
                        platform.log("something went wrong updating the room's occupancy state")
                        return
                      }

                      platform.log('updated occupancy => false of room id: '+ outRoom.get('id'))
                    })
                  } else {
                    // Room remains occupied by some (calculated) number of persons
                    platform.log('room w/ id '+ outRoom.get('id') +' remains occupied by '+ occupancyData.barrier_total + ' person')
                  }
                } else {
                  // If there are motion sensors, then the outRoom's occupancy will be analyzed by the periodic adjust routine
                }
              })
            })
            
            // set 'in' room's occupancy ==> true
            inRoomAccessory.getService(Service.OccupancySensor)
              .setCharacteristic(Characteristic.OccupancyDetected, true)
            inRoom.set('is_occupied', true)
            inRoom.update((success, updatedRoomData) => {
              if(!success) {
                platform.log('inRoom.update ... ' + updatedRoomData)
                return
              } else if (updatedRoomData === undefined) {
                platform.log("something went wrong updating the room's occupancy state")
                return
              }

              platform.log('updated occupancy => true of room id: '+ inRoom.get('id'))
            })
          })
        } else {
          platform.log('erroneous number of rooms associated w/ barrier sernsor id= '+ sensor.get('id'))
          return
        } 
      }
    })
  })
  return
}


OccupiPlatform.prototype.updater = function () {
  platform = this
  platform.log("occupancy updater")

  // Get all rooms
  Room.getAll((success, roomsData) => {
    if(!success) {
      platform.log('Room.getAll ... ' + roomsData)
      return
    } else if (roomsData === undefined) {
      platform.log("something went wrong getting all rooms data")
      return
    }

    for (roomData of roomsData) {

      room = new Room(roomData)
      timeWindow = room.get('is_bedroom') ? '360 min' : '120 min'

      room.getOccupancyData(timeWindow, (success, occupancyData) => {
        if(!success) {
          platform.log('room.getOccupancyData ... ' + occupancyData)
          return
        } else if (occupancyData === undefined) {
          platform.log("something went wrong getting the outRoom occupancy data")
          return
        }

        if (occupancyData.is_occupied) {
          if (occupancyData.barrier_total <= 0 && occupancyData.motion_total == 0) {
          
            // set 'in' room's occupancy ==> false
            accessory = platform.accessories[occupancyData.room_id]
            accessory.getService(Service.OccupancySensor)
                .setCharacteristic(Characteristic.OccupancyDetected, false)

            thisRoom = new Room({ id: occupancyData.room_id })
            thisRoom.set('is_occupied', false)
            thisRoom.update((success, updatedRoomData) => {
              if(!success) {
                platform.log('room.update ... ' + updatedRoomData)
                return
              } else if (updatedRoomData === undefined) {
                platform.log("something went wrong updating the room's occupancy state")
                return
              }

              platform.log('updated occupancy => false of room id: '+ occupancyData.room_id)

            })
          }
        }
      })
    }
  })
}


// Method to remove accessories from HomeKit
OccupiPlatform.prototype.removeAccessory = function (accessory) {
  if (accessory) {
    name = accessory.context.name
    this.log(name + " is removed from HomeBridge.")
    this.api.unregisterPlatformAccessories("Occupi", "Occupi", [accessory])
    delete this.accessories[name]
  }
}



// Sample function to show how developer can add accessory dynamically from outside event
OccupiPlatform.prototype.addAccessory = function(data) {
  this.log("Add Accessory")
  platform = this

  accessory = this.accessories[data.room_id]

  if (!accessory) {
    uuid = UUIDGen.generate(String(data.room_id))
    accessory = new Accessory(data.name, uuid)

    // Setup HomeKit switch service
    accessory.addService(Service.OccupancySensor, data.name)

    accessory.reachable = true

    // Setup listeners for different switch events
    this.setService(accessory)
    
    // Setup listeners for different switch events
    accessory.on('identify', function(paired, callback) {
      platform.log(accessory.displayName, "Identify!")
      callback()
    })

    // Store accessory in cache
    this.accessories[data.room_id] = accessory
    this.api.registerPlatformAccessories("homebridge-occupi", "OccupiPlatform", [accessory])
  }

  // Store and initialize variables into context
  cache = accessory.context
  
  cache.name = data.name         
  cache.room_id = data.room_id    // The room with which the Occupancy Sensor is associated
  //  cache.on_cmd = data.on_cmd
  //  cache.off_cmd = data.off_cmd
  //  cache.state_cmd = data.state_cmd
  //  cache.manufacturer = data.manufacturer
  //  cache.model = data.model
  //  cache.serial = data.serial
  if (cache.state === undefined) {
    cache.state = false
  }

  // Retrieve initial state
  this.getInitState(accessory)
}

OccupiPlatform.prototype.setService = function(accessory) {
  accessory.getService(Service.OccupancySensor)
    .getCharacteristic(Characteristic.OccupancyDetected)
    .on('get', this.getOccupancyDetectorOccupancyStatus.bind(this, accessory.context))
    .on('set', this.setOccupancyDetectorOccupancyStatus.bind(this, accessory.context))
}




OccupiPlatform.prototype.getOccupancyDetectorOccupancyStatus = function (accessory, callback) {
  callback(null, accessory.state)
}


OccupiPlatform.prototype.setOccupancyDetectorOccupancyStatus = function (accessory, toState, callback) {
  accessory.state = toState
  callback(null)
}



// Method to retrieve initial state
OccupiPlatform.prototype.getInitState = function (accessory) {
  platform = this

  manufacturer = accessory.context.manufacturer || "Default-Manufacturer"
  model = accessory.context.model || "Default-Model"
  serial = accessory.context.serial || "Default-SerialNumber"

  // Update HomeKit accessory information
  accessory.getService(Service.AccessoryInformation)
    .setCharacteristic(Characteristic.Manufacturer, manufacturer)
    .setCharacteristic(Characteristic.Model, model)
    .setCharacteristic(Characteristic.SerialNumber, serial)

  Room.getByID(accessory.context.room_id, (success, roomData) => {
    if(!success) {
      platform.log('Room.getByID ... ' + roomData)
      return
    } else if (roomData === undefined) {
      platform.log("something went wrong getting room data")
      return
    }

    room = new Room(roomData)
    timeWindow = room.get('is_bedroom') ? '360 min' : '120 min'

    room.getOccupancyData(timeWindow, (success, occupancyData) => {
      if(!success) {
        platform.log('room.getOccupancyData ... ' + occupancyData)
        return
      } else if (occupancyData === undefined) {
        platform.log("something went wrong getting the outRoom occupancy data")
        return
      }

      if (!occupancyData.room_id) { 
        occupancyData.is_occupied = false
      }

      if (occupancyData.is_occupied) {
        if (occupancyData.barrier_total <= 0 && occupancyData.motion_total == 0) {
          // set 'in' room's occupancy ==> false
          thisRoom = new Room({ id: occupancyData.room_id })
          thisRoom.set('is_occupied', false)
          thisRoom.update((success, updatedRoomData) => {
            if(!success) {
              platform.log('room.update ... ' + updatedRoomData)
              return
            } else if (updatedRoomData === undefined) {
              platform.log("something went wrong updating the room's occupancy state")
              return
            }

            platform.log('updated occupancy => false of room id: '+ occupancyData.room_id)

            accessory.getService(Service.OccupancySensor)
              .setCharacteristic(Characteristic.OccupancyDetected, false)

          })
        } else {
          platform.log('Room ID '+ occupancyData.room_id +' is occupied')
          accessory.getService(Service.OccupancySensor)
            .setCharacteristic(Characteristic.OccupancyDetected, true)
        }
      } else {
        platform.log('Room ID '+ occupancyData.room_id +' is NOT occupied')
        accessory.getService(Service.OccupancySensor)
          .setCharacteristic(Characteristic.OccupancyDetected, false)
      }

      // Configured accessory is reachable
      accessory.updateReachability(true)
    })
  })
}






/*


const bluetooth = require('node-bluetooth')
 
// create bluetooth device instance
const device = new bluetooth.DeviceINQ()


device.listPairedDevices(platform.log)

connected = false
counter = 7
intervalID = setInterval(
  function(){
    if (!connected) {

      platform.log(counter)
      bluetooth.connect('40-98-ad-3a-05-a7', counter, function(err, connection) {
        if(!err) {
          platform.log("great success!")
          connected = true
        } else {
          counter ++
        }
      })
    }
  }, 2000
)


// make bluetooth connect to remote device
bluetooth.connect('40-98-ad-3a-05-a7', 7, function(err, connection){
  if(err) return console.error(err)

  connection.on('data', (buffer) => {
    platform.log('received message:', buffer.toString())
  })
})












*/