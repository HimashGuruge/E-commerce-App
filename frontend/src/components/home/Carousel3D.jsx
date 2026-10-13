import React, { useState, useEffect, useRef } from 'react';
import api from '@/utils/api';

const RADIUS = 500;
const AUTO_ROTATE_SPEED = 0.15;
const INITIAL_ROTATION = 180;

export default function Carousel3D() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(INITIAL_ROTATION);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);

  const rotationRef = useRef(INITIAL_ROTATION);
  const xPosRef = useRef(0);
  const rafRef = useRef(null);
  const isDraggingRef = useRef(false);
  const snapTimerRef = useRef(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/api/slider?active=true');
        const data = res.data?.items || [];
        setItems(data);
        if (data.length > 0) {
          rotationRef.current = INITIAL_ROTATION;
          setRotation(INITIAL_ROTATION);
        }
      } catch (err) {
        console.error('Failed to fetch slider items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    if (loading || items.length === 0) return;

    const animate = () => {
      if (!isDraggingRef.current) {
        rotationRef.current = (rotationRef.current + AUTO_ROTATE_SPEED) % 360;
        setRotation(rotationRef.current);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loading, items.length]);

  useEffect(() => {
    if (!dragging && items.length > 0) {
      const step = 360 / items.length;
      const snap = Math.round(rotationRef.current / step) * step;
      rotationRef.current = snap;
      setRotation(snap);
      setSnapping(true);
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => setSnapping(false), 500);
    }
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, [dragging, items.length]);

  if (loading || items.length === 0) return null;

  const angleStep = 360 / items.length;

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    setDragging(true);
    xPosRef.current = e.clientX || e.touches?.[0]?.clientX || 0;
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const delta = clientX - xPosRef.current;
    rotationRef.current = ((rotationRef.current + delta * 0.3) % 360 + 360) % 360;
    setRotation(rotationRef.current);
    xPosRef.current = clientX;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    setDragging(false);
  };

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{
        height: '400px',
        perspective: '1200px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      <style>{`
        .carousel-ring {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .carousel-slide {
          position: absolute;
          width: 280px;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          pointer-events: none;
        }
        .carousel-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .carousel-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 5;
          background: linear-gradient(to left, rgba(0,0,0,0.6) 8%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 92%);
        }
      `}</style>

      <div className="carousel-vignette" />

      <div
        className="carousel-ring"
        style={{
          transform: `rotateY(${rotation}deg)`,
          transition: snapping ? 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        {items.map((item, i) => {
          const angle = i * angleStep;
          return (
            <div
              key={item._id}
              className="carousel-slide"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${RADIUS}px) rotateY(${-angle}deg)`,
              }}
            >
              <img
                src={item.imageUrl}
                alt={item.altText || ''}
                draggable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
