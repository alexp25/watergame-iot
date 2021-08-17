/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('sensor', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    sensorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      field: 'sensor_id'
    },
    sensorTypeCode: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'sensor_type_code'
    },
    logRate: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'log_rate'
    },
    topicCode: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: 'topic',
        key: 'code'
      },
      field: 'topic_code'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'timestamp'
    },
    lat: {
      type: "DOUBLE",
      allowNull: true,
      field: 'lat'
    },
    lng: {
      type: "DOUBLE",
      allowNull: true,
      field: 'lng'
    }
  }, {
    tableName: 'sensor'
  });
};
