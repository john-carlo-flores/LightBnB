$(() => {

  // const $makeReservationForm = $(`
  function makeReservationForm(property_id) {
    return $(`
      <form id="reservation-form" class="reservation-form">
        <p>Reserve Property</p>
        <div class="login-form__field-wrapper">
          <label for="start_date">Start Date</label>
          <input type="date" name="start_date">
        </div>
        
        <input type="hidden" name="property_id" value="${property_id}">
        
        <div class="login-form__field-wrapper">
          <label for="start_date">End Date</label>
          <input type="date" name="end_date">
        </div>

        <div class="login-form__field-wrapper">
            <button>Reserve Property</button>
            <a id="reservation-form__cancel" href="#">Cancel</a>
        </div>
      </form>
    `);
  }

  window.makeReservationForm = makeReservationForm;

  $(document.body).on('submit', '#reservation-form', function(event) {
    event.preventDefault();

    const data = $(this).serialize();
    submitReservation(data)
      .then(() => {
        propertyListings.clearListings();
        getAllReservations()
          .then(function(json) {
            propertyListings.addProperties(json.reservations, true);
            views_manager.show('listings');
          })
          .catch(error => console.error(error));
      });
  });

  $('body').on('click', '#reservation-form__cancel', function() {
    views_manager.show('listings');
    return false;
  });
      
});