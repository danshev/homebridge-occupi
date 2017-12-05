http = require('http')
Accessory, Service, Characteristic, UUIDGen

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
cmdSwitchPlatform.prototype.configureAccessory = function (accessory) {
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
  this.periodicUpdater = setTimeout(this.updater.bind(this), this.periodicUpdaterInterval)
}


OccupiPlatform.prototype.updater = function () {
  platform = this

  platform.log("occupancy updater")

/*
  // Get all rooms
  Room.getAll((success, roomsData) => {
    if(!success) {
      console.log('Room.getAll ... ' + roomsData)
      return
    } else if (roomsData === undefined) {
      console.log("something went wrong getting all rooms data")
      return
    }

    for (roomData of roomsData) {

      room = new Room(roomData)
      timeWindow = room.get('is_bedroom') ? '360 min' : '120 min'

      room.getOccupancyData(timeWindow, (success, occupancyData) => {
        if(!success) {
          console.log('room.getOccupancyData ... ' + occupancyData)
          return
        } else if (occupancyData === undefined) {
          console.log("something went wrong getting the outRoom occupancy data")
          return
        }

        if ((occupancyData.barrier_total <= 0 && occupancyData.motion_total == 0) && occupancyData.is_occupied) {
          
          // set 'in' room's occupancy ==> false
          thisRoom = new Room({ id: occupancyData.room_id })
          thisRoom.set('is_occupied', false)
          thisRoom.update((success, updatedRoomData) => {
            if(!success) {
              console.log('room.update ... ' + updatedRoomData)
              return
            } else if (updatedRoomData === undefined) {
              console.log("something went wrong updating the room's occupancy state")
              return
            }

            console.log('updated occupancy => false of room id: '+ occupancyData.room_id)
          })
        }
      })
    }
  })
*/
}



// Sample function to show how developer can add accessory dynamically from outside event
SamplePlatform.prototype.addAccessory = function(data) {
  this.log("Add Accessory")
  platform = this

  accessory = this.accessories[data.room_id]

  if (!accessory) {
    uuid = UUIDGen.generate(data.room_id)
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

    this.api.registerPlatformAccessories("homebridge-occupi", "OccupiPlatform", [accessory])

    // Store accessory in cache
    this.accessories[data.room_id] = accessory
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
      console.log('Room.getAll ... ' + roomData)
      return
    } else if (roomData === undefined) {
      console.log("something went wrong getting all rooms data")
      return
    }

    room = new Room(roomData)
    timeWindow = room.get('is_bedroom') ? '360 min' : '120 min'

    room.getOccupancyData(timeWindow, (success, occupancyData) => {
      if(!success) {
        console.log('room.getOccupancyData ... ' + occupancyData)
        return
      } else if (occupancyData === undefined) {
        console.log("something went wrong getting the outRoom occupancy data")
        return
      }

      if ((occupancyData.barrier_total <= 0 && occupancyData.motion_total == 0) && occupancyData.is_occupied) {
        
        // set 'in' room's occupancy ==> false
        thisRoom = new Room({ id: occupancyData.room_id })
        thisRoom.set('is_occupied', false)
        thisRoom.update((success, updatedRoomData) => {
          if(!success) {
            console.log('room.update ... ' + updatedRoomData)
            return
          } else if (updatedRoomData === undefined) {
            console.log("something went wrong updating the room's occupancy state")
            return
          }

          console.log('updated occupancy => false of room id: '+ occupancyData.room_id)

          accessory.getService(Service.OccupancySensor)
            .setCharacteristic(Characteristic.OccupancyDetected, false)

        })
      } else {
          accessory.getService(Service.OccupancySensor)
            .setCharacteristic(Characteristic.OccupancyDetected, true)
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


device.listPairedDevices(console.log)

connected = false
counter = 7
intervalID = setInterval(
  function(){
    if (!connected) {

      console.log(counter)
      bluetooth.connect('40-98-ad-3a-05-a7', counter, function(err, connection) {
        if(!err) {
          console.log("great success!")
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
    console.log('received message:', buffer.toString())
  })
})












*/