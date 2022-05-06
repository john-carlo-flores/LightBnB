module.exports = function(router, database) {

  router.get('/properties', (req, res) => {
    database.getAllProperties(req.query, 20)
    .then(properties => res.send({properties}))
    .catch(e => {
      console.error(e);
      res.send(e)
    }); 
  });

  router.get('/reservations', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      res.error("💩");
      return;
    }
    database.getAllReservations(userId)
    .then(reservations => res.send({reservations}))
    .catch(e => {
      console.error(e);
      res.send(e)
    });
  });

  router.post('/properties', (req, res) => {
    const userId = req.session.userId;
    database.addProperty({...req.body, owner_id: userId})
      .then(property => {
        res.send(property);
      })
      .catch(e => {
        console.error(e);
        res.send(e)
      });
  });

  router.post('/reservations', (req, res) => {
    const userId = req.session.userId;
    const { start_date, end_date, property_id } = req.body;

    console.log(`/reservations`, start_date, end_date, property_id);

    const reservation = {
      guest_id: userId,
      property_id,
      start_date,
      end_date
    }

    if (!userId) return res.error("💩");

    database.checkReservationExists(start_date, end_date)
      .then(reservations => {
        console.log('checkReservaionExists', reservations);
        if (reservations.length) {
          return res.send({message: 'Reservation not available.'});
        }
        res.send(database.addReservation(reservation));
      })
      .catch(e => {
        console.error(e);
        res.send(e);
      });
  });

  return router;
}