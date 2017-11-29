  schemas = {
  
  // Sensor
  sensor: {
    id: null,
    type: null,
    bluetooth_identifier: null      // UNIQUE INDEX ON THIS
  }

  // Room
  room: {
    id: null,
    is_bedroom: null,
    has_sunlight: null,
    is_occupied: null,
    homekit_identifier: null
  }

  // RoomSensor
  roomSensor: {
    id: null,
    type: null
  }

  // MotionDetect
  motionDetect: {
    id: null,
    type: null
  }

  // BarrierDetect
  barrierDetect: {
    id: null,
    type: null
  }

}