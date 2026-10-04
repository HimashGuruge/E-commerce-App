import React, { useState, useEffect } from 'react';
import api from '@/utils/api';

export default function InfiniteSlider({
  speed = 40,
  slideHeight = 100,
  pauseOnHover = true,
  className = ''
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/api/slider?active=true');
        setItems(res.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch slider items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading || items.length === 0) return null;

  const totalSlides = items.length;

  const getStyles = () => {
    return `
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(calc(-${slideHeight * 2.5}px * ${totalSlides})); }
      }
      .slider {
        background: white;
        box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.125);
        height: ${slideHeight}px;
        margin: auto;
        overflow: hidden;
        position: relative;
        width: 100%;
      }
      .slider::before,
      .slider::after {
        content: "";
        height: ${slideHeight}px;
        position: absolute;
        width: 200px;
        z-index: 2;
        pointer-events: none;
      }
      .slider::before {
        left: 0;
        top: 0;
        background: linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);
      }
      .slider::after {
        right: 0;
        top: 0;
        background: linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%);
      }
      .slide-track {
        animation: scroll ${speed}s linear infinite;
        display: flex;
        width: calc(${slideHeight * 2.5}px * ${totalSlides * 2});
      }
      .slide-track:hover {
        animation-play-state: ${pauseOnHover ? 'paused' : 'running'};
      }
      .slide {
        height: ${slideHeight}px;
        width: ${slideHeight * 2.5}px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .slide img {
        height: ${slideHeight}px;
        width: ${slideHeight * 2.5}px;
        object-fit: cover;
      }
    `;
  };

  return (
    <div className={`slider ${className}`}>
      <style>{getStyles()}</style>
      <div className="slide-track">
        {items.map((item) => (
          <div key={item._id} className="slide">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <img src={item.imageUrl} alt={item.altText || ''} />
              </a>
            ) : (
              <img src={item.imageUrl} alt={item.altText || ''} />
            )}
          </div>
        ))}
        {items.map((item) => (
          <div key={`dup-${item._id}`} className="slide" aria-hidden="true">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <img src={item.imageUrl} alt={item.altText || ''} />
              </a>
            ) : (
              <img src={item.imageUrl} alt={item.altText || ''} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
