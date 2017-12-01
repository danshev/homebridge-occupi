  schemas = {
  
  // Sensor
  sensor: {
    id: null,
    bluetooth_address: null,    // UNIQUE INDEX ON THIS
    bluetooth_channel: null,
    type: null
  },

  // Room
  room: {
    id: null,
    name: null,
    is_bedroom: false,
    has_sunlight: false,
    homekit_id: null,
    is_occupied: false
  },

  // RoomSensor
  roomSensor: {
    room_id: null,
    sensor_id: null,
    direction: null
  },

  // MotionDetect
  motionDetect: {
    id: null,
    sensor_id: null,
    timestamp: null
  },

  // BarrierDetect
  barrierDetect: {
    id: null,
    room_id: null,
    direction: null,
    timestamp: null
  }
}

module.exports = schemas