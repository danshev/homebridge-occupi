const Service, Characteristic;
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("switch-plugin", "MyAwesomeSwitch", mySwitch);
};

mySwitch.prototype = {
  getServices: function () {
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Shevenell")
      .setCharacteristic(Characteristic.Model, "v0.1")
      .setCharacteristic(Characteristic.SerialNumber, "123-456-789");

    let switchService = new Service.Switch("My switch");
    switchService
      .getCharacteristic(Characteristic.On)
        .on('get', this.getSwitchOnCharacteristic.bind(this))
        .on('set', this.setSwitchOnCharacteristic.bind(this));
 
    this.informationService = informationService;
    this.switchService = switchService;
    return [informationService, switchService];
  }
};

const request = require('request');
const url = require('url');
 
function mySwitch(log, config) {
  this.log = log;
  this.getUrl = url.parse(config['getUrl']);
  this.postUrl = url.parse(config['postUrl']);
}
 

mySwitch.prototype = {
 
  getSwitchOnCharacteristic: function (next) {
    const me = this;
    request({
        url: me.getUrl,
        method: 'GET',
    }, 
    function (error, response, body) {
      if (error) {
        me.log('STATUS: ' + response.statusCode);
        me.log(error.message);
        return next(error);
      }
      return next(null, body.currentState);
    });
  },
   
  setSwitchOnCharacteristic: function (on, next) {
    const me = this;
    request({
      url: me.postUrl,
      body: {'targetState': on},
      method: 'POST',
      headers: {'Content-type': 'application/json'}
    },
    function (error, response) {
      if (error) {
        me.log('STATUS: ' + response.statusCode);
        me.log(error.message);
        return next(error);
      }
      return next();
    });
  }
};




/* ====================================================================================================== */






const Service, Characteristic;
 
module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-occupancy-plugin", "myOccupancySensor", myOccupancySensor);
};

myOccupancySensor.prototype = {
  getServices: function () {
    let informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Shevenell")
      .setCharacteristic(Characteristic.Model, "v0.1")
      .setCharacteristic(Characteristic.SerialNumber, "123-456-789");

    // Required characteristic
    let occupancyService = new Service.OccupancySensor("My OccupancySensor");
    occupancyService
      .getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', this.getOccupancyStatus.bind(this))
        .on('set', this.setOccupancyStatus.bind(this));
 
    this.informationService = informationService;
    this.occupancyService = occupancyService;
    return [informationService, occupancyService];
  }
};



const request = require('request');
const url = require('url');
 
function mySwitch(log, config) {
  this.log = log;
  this.getUrl = url.parse(config['getUrl']);
  this.postUrl = url.parse(config['postUrl']);
}
 
myOccupancySensor.prototype = {
 
  getOccupancyStatus: function (next) {
    const me = this;
    request({
        url: me.getUrl,
        method: 'GET',
    }, 
    function (error, response, body) {
      if (error) {
        me.log('STATUS: ' + response.statusCode);
        me.log(error.message);
        return next(error);
      }
      return next(null, body.currentState);
    });
  },
   
  setOccupancyStatus: function (occupied, next) {
    const me = this;
    request({
      url: me.postUrl,
      body: {'targetState': occupied},
      method: 'POST',
      headers: {'Content-type': 'application/json'}
    },
    function (error, response) {
      if (error) {
        me.log('STATUS: ' + response.statusCode);
        me.log(error.message);
        return next(error);
      }
      return next();
    });
  }
};




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





I apologize, because I do not like to pollute GitHub's "Issues" section with questions.  But ...

1. Is there somewhere _**else**_ we can go to discuss Homebridge questions / approaches / etc.?  A Slack channel, etc.?

My actual question:

2. I would like to have a Bluetooth device (which will NOT be registered with HomeKit as an Accessory) communicate to my Rapsberry Pi.  The communication from the device would be processed by custom logic and change the status of a Homebridge accessory.

So, an acecdotal example:

1. I have a bluetooth-enabled "Easy" button registered with / linked to my Raspberry Pi.
2. I tap this "Easy" button and my Homebridge plugin is alerted.  The plugin increments some variable's value by 1.
3. If the variable's value reaches ten, then my Homebridge plugin will turn on a lightbulb.

How 
























*/