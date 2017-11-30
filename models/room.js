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



module.exports = Room