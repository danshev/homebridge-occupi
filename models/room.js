var schemas = require("./schemas.js")
var _ = require("lodash")

var Room = function (data) {
    this.data = this.sanitize(data)
}

Room.prototype.data = {}

Room.prototype.get = function (attr) {
    return this.data[attr]
}

Room.prototype.set = function (attr, value) {
    this.data[attr] = value
}

Room.prototype.sanitize = function (data) {
    data = data || {}
    schema = schemas.room
    return _.pick(_.defaults(data, schema), _.keys(schema))
}

// Helper functions

Room.prototype.save = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'INSERT INTO room(name, is_bedroom, has_sunlight, homekit_id, is_occupied) VALUES($1, $2, $3, $4, $5) RETURNING *;'
  const values = [this.data.name, this.data.is_bedroom, this.data.has_sunlight, this.data.homekit_id, this.data.is_occupied]

  module.parent.client.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

Room.prototype.update = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = 'UPDATE room SET is_occupied = $2 WHERE id = $1 RETURNING *;'
  const values = [this.data.id, this.data.is_occupied]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}

Room.prototype.getOccupancyData = function (timeWindow, callback) {

  this.data = this.sanitize(this.data)

  const queryString = "SELECT (SELECT COUNT(*) FROM barrier_detect WHERE room_id = $1 AND direction = 'in' AND timestamp > (now() - INTERVAL '"+ timeWindow +"')) - (SELECT COUNT(*) FROM barrier_detect WHERE room_id = $1 AND direction = 'out' AND timestamp > (now() - INTERVAL '"+ timeWindow +"')) AS barrier_total, (SELECT timestamp FROM barrier_detect WHERE room_id = $1 ORDER BY timestamp DESC LIMIT 1) AS last_out, $1 AS room_id, (SELECT is_occupied FROM room WHERE id = $1) AS is_occupied, (SELECT count(*) FROM motion_detect md INNER JOIN room_sensor rs ON md.sensor_id = rs.sensor_id WHERE rs.room_id = $1 AND timestamp > greatest(coalesce((SELECT timestamp FROM barrier_detect WHERE room_id = $1 ORDER BY timestamp DESC LIMIT 1), now() - INTERVAL '"+ timeWindow +"'), now() - INTERVAL '"+ timeWindow +"')) AS motion_total;"
  const values = [this.data.id]

/*
SELECT 
  $1 AS room_id,
  (SELECT 
    COUNT(*) 
  FROM barrier_detect 
  WHERE 
    room_id = $1 
    AND direction = 'in'
    AND timestamp > (now() - INTERVAL '"+ timeWindow +"')
  ) - (
  SELECT 
    COUNT(*) 
  FROM barrier_detect 
  WHERE 
    room_id = $1 
    AND direction = 'out'
    AND timestamp > (now() - INTERVAL '"+ timeWindow +"')
  ) AS barrier_total, 
  (SELECT
    timestamp 
  FROM barrier_detect 
  WHERE 
    room_id = $1 
  ORDER BY 
    timestamp 
  DESC LIMIT 1) AS last_out, 
  (SELECT 
    is_occupied 
  FROM room 
  WHERE 
    id = $1) AS is_occupied, 
  (SELECT
    count(*)
  FROM motion_detect md 
  INNER JOIN room_sensor rs 
  ON md.sensor_id = rs.sensor_id 
  WHERE 
    rs.room_id = 2 
    AND timestamp > greatest(coalesce(
                      (SELECT 
                        timestamp 
                      FROM barrier_detect 
                      WHERE 
                        room_id = 2 
                      ORDER BY timestamp 
                      DESC LIMIT 1), 
                      now() - INTERVAL '"+ timeWindow +"'
                    ), now() - INTERVAL '"+ timeWindow +"')
    ) AS motion_total
*/


  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0])
    }
  })
}


Room.prototype.getNumberMotionSensors = function (callback) {

  this.data = this.sanitize(this.data)

  const queryString = "SELECT count(*) FROM sensor s INNER JOIN room_sensor rs ON s.id = rs.sensor_id INNER JOIN room r ON rs.room_id = r.id WHERE r.id = $1 AND s.type = 'motion';"
  const values = [this.data.id]

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows[0].count)
    }
  })
}

Room.getAll = function (callback) {
  const queryString = "SELECT * FROM room;"
  const values = []

  module.parent.pool.query(queryString, values, (err, res) => {
    if (err) {
      callback(false, err)
    } else {
      callback(true, res.rows)
    }
  })
}



module.exports = Room