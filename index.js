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
  callback()
}


OccupiPlatform.prototype.setOccupancyDetectorOccupancyStatus = function (accessory, toState, callback) {
  this.context.state = toState
  callback()
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


  // Perhaps query database and init occupancy state based on routine?

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








// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
OccupiPlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory")
  platform = this

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = true

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identify!!!")
    callback()
  })

  if (accessory.getService(Service.Lightbulb)) {
    accessory.getService(Service.Lightbulb)
    .getCharacteristic(Characteristic.On)
    .on('set', function(value, callback) {
      platform.log(accessory.displayName, "Light -> " + value)
      callback()
    })
  }

  this.accessories.push(accessory)
}



// Handler will be invoked when user try to config your plugin.
// Callback can be cached and invoke when necessary.
OccupiPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
  this.log("Context: ", JSON.stringify(context))
  this.log("Request: ", JSON.stringify(request))

  // Check the request response
  if (request && request.response && request.response.inputs && request.response.inputs.name) {
    this.addAccessory(request.response.inputs.name)

    // Invoke callback with config will let homebridge save the new config into config.json
    // Callback = function(response, type, replace, config)
    // set "type" to platform if the plugin is trying to modify platforms section
    // set "replace" to true will let homebridge replace existing config in config.json
    // "config" is the data platform trying to save
    callback(null, "platform", true, {"platform":"OccupiPlatform", "otherConfig":"SomeData"})
    return
  }

  // - UI Type: Input
  // Can be used to request input from user
  // User response can be retrieved from request.response.inputs next time
  // when configurationRequestHandler being invoked

  respDict = {
    "type": "Interface",
    "interface": "input",
    "title": "Add Accessory",
    "items": [
      {
        "id": "name",
        "title": "Name",
        "placeholder": "Fancy Light"
      }//, 
      // {
      //   "id": "pw",
      //   "title": "Password",
      //   "secure": true
      // }
    ]
  }

  // - UI Type: List
  // Can be used to ask user to select something from the list
  // User response can be retrieved from request.response.selections next time
  // when configurationRequestHandler being invoked

  // respDict = {
  //   "type": "Interface",
  //   "interface": "list",
  //   "title": "Select Something",
  //   "allowMultipleSelection": true,
  //   "items": [
  //     "A","B","C"
  //   ]
  // }

  // - UI Type: Instruction
  // Can be used to ask user to do something (other than text input)
  // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

  // respDict = {
  //   "type": "Interface",
  //   "interface": "instruction",
  //   "title": "Almost There",
  //   "detail": "Please press the button on the bridge to finish the setup.",
  //   "heroImage": "base64 image data",
  //   "showActivityIndicator": true,
  // "showNextButton": true,
  // "buttonText": "Login in browser",
  // "actionURL": "https://google.com"
  // }

  // Plugin can set context to allow it track setup process
  context.ts = "Hello"

  // Invoke callback to update setup UI
  callback(respDict)
}





OccupiPlatform.prototype.updateAccessoriesReachability = function() {
  this.log("Update Reachability")
  for (index in this.accessories) {
    accessory = this.accessories[index]
    accessory.updateReachability(false)
  }
}

// Sample function to show how developer can remove accessory dynamically from outside event
OccupiPlatform.prototype.removeAccessory = function() {
  this.log("Remove Accessory")
  this.api.unregisterPlatformAccessories("homebridge-occupi", "SamplePlatform", this.accessories)

  this.accessories = []
}




























const Service, Characteristic
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory("switch-plugin", "MyAwesomeSwitch", mySwitch)
}

mySwitch.prototype = {
  getServices: function () {
    let informationService = new Service.AccessoryInformation()
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Shevenell")
      .setCharacteristic(Characteristic.Model, "v0.1")
      .setCharacteristic(Characteristic.SerialNumber, "123-456-789")

    let switchService = new Service.Switch("My switch")
    switchService
      .getCharacteristic(Characteristic.On)
        .on('get', this.getSwitchOnCharacteristic.bind(this))
        .on('set', this.setSwitchOnCharacteristic.bind(this))
 
    this.informationService = informationService
    this.switchService = switchService
    return [informationService, switchService]
  }
}

const request = require('request')
const url = require('url')
 
function mySwitch(log, config) {
  this.log = log
  this.getUrl = url.parse(config['getUrl'])
  this.postUrl = url.parse(config['postUrl'])
}
 

mySwitch.prototype = {
 
  getSwitchOnCharacteristic: function (next) {
    const me = this
    request({
        url: me.getUrl,
        method: 'GET',
    }, 
    function (error, response, body) {
      if (error) {
        me.log('STATUS: ' + response.statusCode)
        me.log(error.message)
        return next(error)
      }
      return next(null, body.currentState)
    })
  },
   
  setSwitchOnCharacteristic: function (on, next) {
    const me = this
    request({
      url: me.postUrl,
      body: {'targetState': on},
      method: 'POST',
      headers: {'Content-type': 'application/json'}
    },
    function (error, response) {
      if (error) {
        me.log('STATUS: ' + response.statusCode)
        me.log(error.message)
        return next(error)
      }
      return next()
    })
  }
}









const Service, Characteristic
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory("homebridge-occupi", "OccupiSensor", OccupiSensor)
}

function OccupiSensor(log, config) {
  this.log = log
  this.getUrl = url.parse(config['getUrl'])
  this.postUrl = url.parse(config['postUrl'])
}


const request = require('request')
const url = require('url')
 
OccupiSensor.prototype = {
 
  getOccupancyStatus: function (next) {
    const me = this
    request({
        url: me.getUrl,
        method: 'GET',
    }, 
    function (error, response, body) {
      if (error) {
        me.log('STATUS: ' + response.statusCode)
        me.log(error.message)
        return next(error)
      }
      return next(null, body.currentState)
    })
  },
   
  setOccupancyStatus: function (occupied, next) {
    const me = this
    request({
      url: me.postUrl,
      body: {'targetState': occupied},
      method: 'POST',
      headers: {'Content-type': 'application/json'}
    },
    function (error, response) {
      if (error) {
        me.log('STATUS: ' + response.statusCode)
        me.log(error.message)
        return next(error)
      }
      return next()
    })
  }
}

OccupiSensor.prototype = {
  getServices: function () {
    let informationService = new Service.AccessoryInformation()
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Shevenell")
      .setCharacteristic(Characteristic.Model, "v0.1")
      .setCharacteristic(Characteristic.SerialNumber, "123-456-789")

    // Required characteristic
    let occupancyService = new Service.OccupancySensor("Occupi Sensor")
    occupancyService
      .getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', this.getOccupancyStatus.bind(this))
        .on('set', this.setOccupancyStatus.bind(this))
 
    this.informationService = informationService
    this.occupancyService = occupancyService
    return [informationService, occupancyService]
  }
}


/* Add to config.json in Homebridge diretory:


{
    "bridge": {
        "name": "Homebridge",
        "username": "CC:22:3D:E3:CE:30",
        "port": 51826,
        "pin": "031-45-154"
    },
    
    "description": "This is an example configuration file with one fake accessory and one fake platform. You can use this as a template for creating your own configuration file containing devices you actually own.",

    "accessories": [
        {
            "accessory": "WeMo",
            "name": "Coffee Maker"
        }
    ],

    "platforms": [
        {
            "platform" : "Shevenell-Occupancy-Kit",
            "name" : "OccupancyKit"
        }
    ]
}







{
  "accessory": "myOccupancySensor1",
  "getUrl": "http://192.168.0.10/api/status",
  "postUrl": "http://192.168.0.10/api/order"
}












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