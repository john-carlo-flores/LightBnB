const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [email])
    .then(res => {
      return res.rows[0] || null;
    })
    .catch(err => {
      console.log('Error:', err.stack);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id])
  .then(res => {
    return res.rows[0] || null;
  })
  .catch(err => {
    console.log('Error:', err.stack);
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, 
    [user.name, user.email, user.password])
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log('Error:', err.stack);
    });
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 20) {
  
  const queryString = `
  SELECT reservations.*, properties.*, avg(coalesce(rating, 0)) as average_rating
  FROM reservations
  LEFT JOIN properties ON properties.id = reservations.property_id
  LEFT JOIN property_reviews ON property_reviews.property_id = properties.id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2`;

  console.log(queryString, [guest_id, limit]);

  return pool
    .query(queryString, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });

}
exports.getAllReservations = getAllReservations;

/**
 * Get all reservations within a given date range.
 * @param {date} start_date The start date of ther reservation.
 * @param {date} end_date The end date of the reservation.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
 const checkReservationExists = function(start_date, end_date) {
  
  const queryString = `
  SELECT *
  FROM reservations
  WHERE (start_date <= $2) and (end_date >= $1)
  `;

  return pool
    .query(queryString, [start_date, end_date])
    .then(res => {
      console.log('checkReservationExists sending');
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });

}
exports.checkReservationExists = checkReservationExists;

/**
 * Add a reservation to the database
 * @param {{}} reservation An object containing all of the reservation details.
 * @return {Promise<{}>} A promise to the reservation.
 */
 const addReservation = function(reservation) {
  const queryString = `
  INSERT INTO reservations (
    start_date,
    end_date,
    property_id,
    guest_id
  )
  VALUES
  ($1, $2, $3, $4) RETURNING *;`;

  const queryParams = [
    reservation.start_date,
    reservation.end_date,
    reservation.property_id,
    reservation.guest_id
  ];

  return pool
    .query(queryString, queryParams)
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log('Error:', err.stack);
    });
}
exports.addReservation = addReservation;

/// Properties

const getWhereAnd = () => {
  const parameter = ['WHERE', 'AND'];

  return function() {
    return parameter.length > 1 ? parameter.shift() : parameter[0];
  }
};

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const queryParams = [];
  const WHERE_AND = getWhereAnd();

  // Basic query
  let queryString = `
  SELECT properties.*, avg(rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id`;

  // Additional options query
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `\n\t${WHERE_AND()} city LIKE $${queryParams.length}`;
  }

  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    queryString += `\n\t${WHERE_AND()} owner_id = $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    queryString += `\n\t${WHERE_AND()} cost_per_night >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    queryString += `\n\t${WHERE_AND()} cost_per_night <= $${queryParams.length}`;
  }

  queryString += `
  GROUP BY properties.id`;

  // Another optional query
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `\n  HAVING avg(rating) >= $${queryParams.length}`;
  }

  //Ending query
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length}`;

  console.log(queryString);

  //Submit
  return pool.query(queryString, queryParams).then((res) => res.rows);
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    street,
    city,
    province,
    post_code,
    country,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms
  )
  VALUES 
  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;`;

  const queryParams = [
    property.owner_id, 
    property.title, 
    property.description, 
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];

  return pool
    .query(queryString, queryParams)
    .then(res => {
      return res;
    })
    .catch(err => {
      console.log('Error:', err.stack);
    });
}
exports.addProperty = addProperty;