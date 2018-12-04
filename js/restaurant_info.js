var newMap;

/**
 * Store the current restaurant id
 */
const restaurantTemp = (() => {
  function restaurantTemp(){}

  restaurantTemp.restaurantObj = {};

  restaurantTemp.set = (restObj) => {
    const {id} = restObj;
    return restaurantTemp.restaurantObj = {id};
  };

  restaurantTemp.get = () => {
    return restaurantTemp.restaurantObj;
  };

  return restaurantTemp;
})();

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  try {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) { // Got an error!
        console.error(error);
      } else {
        self.newMap = L.map('map', {
          center: [restaurant.latlng.lat, restaurant.latlng.lng],
          zoom: 16,
          scrollWheelZoom: false
        });
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
          mapboxToken: 'pk.eyJ1IjoibXV0aG9taWJyaWFuIiwiYSI6ImNqamw1azFycDFkbWgzcHJsaWM5dnIydXMifQ.cobfZ2wrUlLJIjXgMNlT0A',
          maxZoom: 18,
          attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/" tabindex="-1">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/" tabindex="-1">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/" tabindex="-1">Mapbox</a>',
          id: 'mapbox.streets'
        }).addTo(newMap);
        fillBreadcrumb();
        DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
      }
    });
  } catch (error) {};
};

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */


/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  if (restaurant.is_favorite !== 'false') {
    document.querySelector('.restaurant-favourite').classList.add('favourite');
  } else {
    document.querySelector('.restaurant-favourite').classList.remove('favourite');
  }

  restaurantTemp.set(restaurant);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  const imgSrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.className = 'restaurant-img';
  image.src = `.${imgSrc}-400_1x.jpg`;
  image.alt =  DBHelper.getAltText(restaurant.id);
  image.srcset = `.${imgSrc}-400_1x.jpg 400w, .${imgSrc}-800_2x.jpg 800w`;
  image.sizes = '(min-width: 850px) calc(40vw - 80px), calc(100vw - 40px)';

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  return DBHelper.getRestaurantReviews(restaurant.id)
    .then((reviews) => {
      return fillReviewsHTML(reviews);
    });
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  const rowHeading = document.createElement('tr');
  const dayHeading = document.createElement('th');
  const timeHeading = document.createElement('th');
  dayHeading.innerHTML = 'Day';
  timeHeading.innerHTML = 'Open';
  rowHeading.appendChild(dayHeading);
  rowHeading.appendChild(timeHeading);
  hours.appendChild(rowHeading);
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  title.classList.add('reviews-title');
  container.insertAdjacentElement('afterbegin',title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.setAttribute('role','list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const reviewHeading = document.createElement('div');
  reviewHeading.classList.add('review-heading');
  const name = document.createElement('p');
  name.classList.add('review-name');
  name.innerHTML = review.name;
  reviewHeading.appendChild(name);

  const date = document.createElement('p');
  const d = new Date(review.createdAt);
  date.classList.add('review-date');
  date.innerHTML = d.toDateString();
  reviewHeading.appendChild(date);
  li.appendChild(reviewHeading);

  const rating = document.createElement('p');
  rating.classList.add('review-rating');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.setAttribute('aria-label', `${restaurant.name}`);
  li.setAttribute('aria-current', 'page');
  li.innerHTML = `${restaurant.name}`;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

/**
 * Toggle the favourite button
 */
document.querySelector('.restaurant-favourite').addEventListener('mouseup', e => {
  DBHelper.toggleFavourite(restaurantTemp.get().id, e.target);
  e.target.classList.toggle('favourite');
});

/**
 * Handle add reviews form
 */
const reviewsForm = (() => {
  function reviewsForm(){}

  const form = document.querySelector('#reviews-form');

  const showButton = document.querySelector('.show-review-form');

  const closeButton = document.querySelector('.close-review');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const review = {
      restaurant_id: restaurantTemp.restaurantObj.id,
      name: form.name.value,
      rating: form.rating.value,
      comments: form.review.value,
      createdAt: Date.now()
    };

    DBHelper.createReview(review);

    const ul = document.getElementById('reviews-list');
    ul.setAttribute('role','list');
    ul.insertAdjacentElement('afterbegin',createReviewHTML(review));

    form.setAttribute('hidden', 'true');
    showButton.removeAttribute('hidden');
    form.reset();
  });

  showButton.addEventListener('mouseup', e => {
    form.removeAttribute('hidden');
    showButton.setAttribute('hidden', 'true');
  });

  closeButton.addEventListener('mouseup', e => {
    form.setAttribute('hidden', 'true');
    showButton.removeAttribute('hidden');
  });

  return reviewsForm;
})();

/*
 implement service worker
*/
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}