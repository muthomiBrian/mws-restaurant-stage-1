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
        restaurantsStore.put(restaurants[restaurantKey]);
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
  static fetchRestaurantById(id, callback = () => {}) {
    // fetch all restaurants with proper error handling.
    return DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
          return Promise.resolve(restaurant)
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
          return Promise.reject('Restaurant does not exist');
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
      }).then(() => {
        DBHelper.updateServerReviews();
      });
  }

  static dash(string) {
    if (string.includes(' ')) {
      const newString = string.replace(' ', '-');
      return DBHelper.dash(newString);
    }

    return string;
  }

  static hash(string) {
    const start = Math.ceil(string.length/2);
    const end = start +  Math.ceil(string.length/4 >= 6 ? 6 : string.length/4);
    return string.substring(start, end);
  }

  static storeReview(review) {
    return DBHelper.openReviewsDB().then(db => {
      if (!db) return;
      const unique =`${DBHelper.dash(DBHelper.hash(review.comments))}`;
      review.unique = unique;
      return db
        .transaction('reviews', 'readwrite')
        .objectStore('reviews')
        .put(review)
        .complete;
    });
  }

  static sendReviewToServer(review) {
    return fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
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
        return DBHelper.getRestaurantReviewsFromServer(restaurant_id)
          .then(res => {
            try {
              [...reviews];
            } catch (error) {
              return [...res];
            }
            const negative = {};

            reviews.forEach(review => {
              negative[review.id] = review;
              negative2[review.unique] = review;
            });

            const negative2 = {};

            const knockOut = res.filter(review => {
              return !negative[review.id];
            });

            const knockOut2 = knockOut.filter(review => {
              return !negative2[review.unique];
            });
            return [...knockOut2, ...reviews];
          })
          .catch(err => {
            return reviews;
          });
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
      .then(res => res.json())
      .then(res => {
        res.reduce((acc, review) => {
          return acc.then(() => {
            return DBHelper.storeReview(review);
          });
        }, Promise.resolve());

        return res;
      });
  }

  /**
   * Update reviews
   */

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
              .then(res => {
                const changedReview = JSON.parse(JSON.stringify(review));
                changedReview.id = res.id;
                return DBHelper.updateReviewsIdb(changedReview);
              });
          });
        }, Promise.resolve());
      });
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
      return DBHelper.setFavourite(id, false);
    }
    return DBHelper.setFavourite(id, true);
  }

  static setFavourite(id, boolean) {
    return DBHelper.fetchRestaurantById(id).then(restaurant => {
      if (!restaurant) return;
      const changedRestaurant = JSON.parse(JSON.stringify(restaurant));
      changedRestaurant.is_favorite = boolean;
      return DBHelper.openRestaurantDB().then(db => {
        if (!db) return;
        return db
          .transaction('restaurants','readwrite')
          .objectStore('restaurants')
          .put(changedRestaurant);
      });
    }).then(() => {
      return fetch(`${DBHelper.DATABASE_URL()}/${id}/?is_favorite=${boolean}`, {method: 'PUT'})

    });
  }
}