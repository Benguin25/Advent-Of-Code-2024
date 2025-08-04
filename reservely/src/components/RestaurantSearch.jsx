import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverviewRestaurants, generateSlug } from '../lib/supabaseService'; // Import Supabase service
import styles from './RestaurantSearch.module.css'; // Import CSS module

export default function RestaurantSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setIsLoading(true);
      try {
        const data = await getOverviewRestaurants();
        setRestaurants(data.map(r => ({ ...r, slug: generateSlug(r.name) }))); // Ensure slug exists
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        // Handle error (e.g., show a message to the user)
      }
      setIsLoading(false);
    };
    fetchRestaurants();
  }, []);

  const filteredRestaurants = useMemo(() => {
    // Only show confirmed restaurants
    const confirmed = restaurants.filter(r => r.confirmed !== false);
    if (!searchQuery) return confirmed;
    return confirmed.filter(
      restaurant =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [restaurants, searchQuery]);

  const handleSearchChange = e => {
    setSearchQuery(e.target.value);
  };
  const handleReserveClick = restaurantSlug => {
    navigate(`/${restaurantSlug}/book`);
  };
  if (isLoading) {
    return (
      <div className="page-container">
        <div className="content-section">
          <div className={styles['restaurant-loading-container']}>
            <div className={styles['restaurant-loading-animation']}></div>
            <h2 className={styles['restaurant-loading-text']}>Discovering Restaurants</h2>
            <p className={styles['restaurant-loading-subtext']}>
              Finding the perfect dining experiences for you...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-section">
        <div className="search-section">
          <h1>Find a Restaurant</h1>
          <div className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by restaurant name, cuisine, or location..."
              className="search-input"
            />
          </div>
          <div className="search-results-count">
            {filteredRestaurants.length} restaurants found
          </div>{' '}
        </div>

        <div className={`restaurant-list ${styles['restaurant-container']}`}>
          {filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id || restaurant.slug}
              className={`restaurant-card ${styles['restaurant-card']}`}
            >
              {restaurant.logo_url && (
                <div
                  className={styles['restaurant-logo']}
                  style={{ textAlign: 'center', marginBottom: '0.5rem' }}
                >
                  <img
                    src={restaurant.logo_url}
                    alt={`${restaurant.name} Logo`}
                    style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }}
                  />
                </div>
              )}
              <div
                className="restaurant-info"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
              >
                <h2 style={{ margin: 0 }}>{restaurant.name}</h2>
                <div className="restaurant-cuisine" style={{ margin: 0, fontWeight: 500 }}>
                  {restaurant.cuisine}
                </div>
                <p style={{ margin: 0 }}>{restaurant.description}</p>
                <div className="restaurant-address" style={{ margin: 0 }}>
                  📍 {restaurant.address}
                </div>
              </div>
              <div className="restaurant-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleReserveClick(restaurant.slug)}
                >
                  Reserve Now
                </button>
              </div>
            </div>
          ))}
          {filteredRestaurants.length === 0 && !isLoading && (
            <div className={styles['no-results']}>
              <div className={styles['no-results-icon']}>🍽️</div>
              <h3>No restaurants found matching "{searchQuery}"</h3>
              <p>
                Try adjusting your search terms or browse from our list of available restaurants
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
