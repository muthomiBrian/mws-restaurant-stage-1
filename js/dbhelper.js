/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static DATABASE_URL() {
    const port = 8887; // Change this to your server port
    return 'http://localhost:1337/restaurants';
  }

  /**
   * Implement IndexDB API using idb
   */
  static openRestaurantDB() {
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
    return idb.open('restaurantDB', 1, function(upgradeDb) {
      const restaurantStore = upgradeDb.createObjectStore('restaurants', {
        keyPath: 'id'
      });
    });
  }

  static openReviewsDB(){
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
    return idb.open('reviewsDB', 1, function(upgradeDb) {
      const reviewsStore = upgradeDb.createObjectStore('reviews', {
        keyPath: 'unique'
      });
    });
  }

  static getRestaurantsFromDB(){
    return DBHelper.openRestaurantDB().then((db) => {
      if (!db) return;
      const tx = db.transaction('restaurants');
      const restaurantsStore = tx.objectStore('restaurants');
      return restaurantsStore.getAll().then((restaurants) => {
        return restaurants;
      });
    });
  }

  static storeRestaurants(restaurants){
    DBHelper.openRestaurantDB().then((db) => {
      if(!db) return;
      const tx = db.transaction('restaurants','readwrite');
      const restaurantsStore = tx.objectStore('restaurants');
      const restaurantKeys = Object.keys(restaurants);
      restaurantKeys.forEach((restaurantKey) => {
        restaurantsStore.put(restaurants[restaurantKey])
      });
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    return DBHelper.getRestaurantsFromDB()
      .then((restaurants) => {
        if (restaurants.length < 1) return fetch(DBHelper.DATABASE_URL()).then(res => res.json());
        return restaurants;
      })
      .then(restaurants => {
        DBHelper.storeRestaurants(restaurants);
        return callback(null, restaurants);
      })
      .catch(err => callback(err, null));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }



  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      });
    marker.addTo(newMap);
    return marker;
  }



  /**
   * Create review
   */

  static createReview(review) {
    return DBHelper.storeReview(review)
      .then(() => {
        return DBHelper.sendReviewToServer(review);
      });
  }

  static storeReview(review) {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      const unique =`${review.restaurant_id}-${Date.now()}`;
      review.unique = unique;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .put(review);
    });
  }

  static sendReviewToServer(review) {
    return fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      },
      body: JSON.stringify(review),
    })
      .then(res => res.json());
  }

  /**
   * Read reviews
   */

  static getRestaurantReviews(restaurant_id) {
    return DBHelper.getRestaurantReviewsIdb(restaurant_id)
      .then(reviews => {
        if (!review) return DBHelper.getRestaurantReviewsFromServer(restaurant_id);
        return reviews;
      });
  }

  static getRestaurantReviewsIdb(restaurant_id) {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews')
        .objectStore('reviews')
        .getAll();
    })
      .then(reviews => {
        if (!reviews || reviews.length < 1) return;
        if (restaurant_id) {
          return reviews.filter(element => {
            return element.restaurant_id === restaurant_id;
          });
        }
        return reviews;
      });
  }

  static getRestaurantReviewsFromServer(restaurant_id) {
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${restaurant_id}`)
      .then(res => res.json);
  }

  /**
   * Update reviews
   */
  static updateReviews(review) {
    return DBHelper.updateReviewsIdb(review)
      .then(() => {
        return DBHelper.updateReviewsServer(review);
      });
  }

  static updateReviewsIdb(review){
    return DBHelper.openRestaurantDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .put(review);
    });
  }

  static updateReviewsServer(review) {
    return fetch(`http://localhost:1337/reviews/${review.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      },
      body: JSON.stringify({
        name : review.name,
        rating: review.rating,
        comments: review.comments
      })
    });
  }

  static updateServerReviews() {
    return DBHelper.getRestaurantReviewsIdb()
      .then(reviews => {
        if (!reviews) return;
        const reviewsNotUploaded = reviews.filter(review => {
          return typeof review.id === 'undefined';
        });
        return reviewsNotUploaded.reduce((acc, review) => {
          return acc.then(() => {
            return DBHelper.sendReviewToServer({
              restaurant_id: review.restaurant_id,
              name: review.name,
              rating: review.rating,
              comments: review.comments
            })
              .then(res => res.json())
              .then(res => {
                const changedReview = JSON.parse(JSON.stringify(review));
                changedReview.id = res.id;
                return DBHelper.updateReviewsIdb(changedReview);
              });
          });
        }, Promise.resolve);
      });
  }

  /**
   * Delete reviews
   */

  static deleteReview(review) {
    return DBHelper.deleteReviewIDB(review)
      .then(() => {
        if (!review.id) return;
        return DBHelper.deleteReviewServer(review);
      });
  }

  static deleteReviewIDB(review) {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .delete(review.unique);
    });
  }

  static deleteReviewServer(review) {
    return fetch(`http://localhost:1337/reviews/${review.id}`, {method: 'DELETE'})
      .then(res => res.json());
  }

  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

  static getAltText(id){
    const altText = {
      '1':'people seated in restaurant',
      '2':'pizza on plate',
      '3':'restaurant with wooden furniture',
      '4':'Katz\'s Delicatessen store front',
      '5':'people seated at Roberta\'s Pizza',
      '6':'people seated at Hometown BBQ',
      '7':'Superiority burger store front',
      '8':'The Dutch',
      '9':'Customers eating',
      '10':'Steel top table'
    };

    return altText[id];
  }

  static toggleFavourite(id, element) {
    if (element.classList.contains('favourite')) {
      return DBHelper.setUnfavourite(id);
    }
    return DBHelper.setFavourite(id);
  }

  static setFavourite(id) {
    return fetch(`${DBHelper.DATABASE_URL()}/${id}/?is_favorite=true`, {method: 'PUT'})
      .then(res => res.json())
      .then(res => {
        return DBHelper.openRestaurantDB().then(db => {
          if (!db) return;
          return db
            .transaction('restaurants','readwrite')
            .objectStore('restaurants')
            .put(res);
        });
      });
  }

  static setUnfavourite(id) {
    return fetch(`${DBHelper.DATABASE_URL()}/${id}/?is_favorite=false`, {method: 'PUT'})
      .then(res => res.json())
      .then(res => {
        return DBHelper.openRestaurantDB().then(db => {
          if (!db) return;
          return db
            .transaction('restaurants','readwrite')
            .objectStore('restaurants')
            .put(res);
        });
      });
  }

  static sendForm(review) {
    const succeededReviews = [];
    // get failed review adds in idb
    return DBHelper.getfailedReviews().then(fReviews => {
      if (fReviews.length < 1) return;
      // send failed reviews first
      return fReviews.reduce((p, f) => p.then(() => {
        // store succeeded review in array by index
        return this.sendReview(f)
          .then(res => {
            succeededReviews.push(f);
            return res;
          });
      }), Promise.resolve());
    }).then(() => {
      // send new review last once the other fReviews succeed or there are no failed reviews
      if (!review) return;
      return this.sendReview(review);
    }).catch(() => {
      // if first failed review fails, add new review to idb failed reviews
      return DBHelper.addFailedReview(review);
    }).then(() => {
      // delete all succeeded reviews from idb using indices
      if (succeededReviews.length < 1) return;
      return succeededReviews.reduce((acc, rev) => acc.then(() => {
        return this.deleteFailed(rev);
      }));
    });
  }

  static getfailedReviews() {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews')
        .objectStore('reviews')
        .getAll();
    });
  }

  sendReview(review) {

  }

  retrySubmission() {
    // when page reloads retry sending reviews starting with old ones first
    return this.sendForm();
  }

  static addFailedReview(review) {
    // send to db
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .put(review);
    });
  }

  static deleteFailed(review) {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .delete(review);
    });
  }

}

