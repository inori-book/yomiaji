'use client';

import { useState, useEffect } from 'react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  isbn: string;
  bookTitle: string;
  onRatingSubmitted: (averageRating: number, totalRatings: number) => void;
}

export default function RatingModal({ 
  isOpen, 
  onClose, 
  isbn, 
  bookTitle, 
  onRatingSubmitted 
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserRating, setCurrentUserRating] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentRating();
    }
  }, [isOpen, isbn]);

  const fetchCurrentRating = async () => {
    try {
      const response = await fetch(`/api/ratings?isbn=${isbn}`);
      if (response.ok) {
        const data = await response.json();
        // 現在のユーザーの評価を取得（簡易実装）
        // 実際の実装では、ユーザーIDを適切に管理する必要があります
        setCurrentUserRating(null); // 現在は常にnull（新規評価として扱う）
      }
    } catch (error) {
      console.error('現在の評価取得エラー:', error);
    }
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn,
          rating: selectedRating,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onRatingSubmitted(data.averageRating, data.totalRatings);
        onClose();
        setSelectedRating(0);
      } else {
        const error = await response.json();
        alert(`評価の投稿に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error('評価投稿エラー:', error);
      alert('評価の投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedRating(0);
    setHoveredRating(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '20px',
          textAlign: 'center',
          color: '#000000',
        }}>
          この本を評価する
        </h2>
        
        <p style={{
          fontSize: '16px',
          marginBottom: '20px',
          textAlign: 'center',
          color: '#666',
        }}>
          『{bookTitle}』
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px',
          gap: '10px',
        }}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => setSelectedRating(rating)}
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(0)}
              style={{
                fontSize: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '5px',
                color: rating <= (hoveredRating || selectedRating) ? '#FFD700' : '#ddd',
                transition: 'color 0.2s',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {selectedRating > 0 && (
          <p style={{
            textAlign: 'center',
          color: '#000000',
            fontSize: '16px',
            marginBottom: '20px',
            color: '#333',
          }}>
            {selectedRating}つ星を選択しました
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '0px',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#8C8C8C',
            }}
          >
            キャンセル
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={selectedRating === 0 || isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedRating === 0 || isSubmitting ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '0px',
              cursor: selectedRating === 0 || isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
            }}
          >
            {isSubmitting ? '送信中...' : '評価を送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
