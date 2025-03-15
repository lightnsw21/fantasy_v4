import React, { useState } from 'react';

const HarUploader: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/api/process-har', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to process HAR file');
            }

            console.log('Processed data:', data.data);
            // Handle the processed data as needed
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h2>Upload HAR File</h2>
            <input
                type="file"
                accept=".har"
                onChange={handleFileUpload}
                disabled={isLoading}
            />
            {isLoading && <p>Processing...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default HarUploader; 