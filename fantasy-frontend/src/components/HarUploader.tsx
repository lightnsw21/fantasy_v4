import React, { useState } from 'react';
import { Text, Button, Group, FileInput, Loader } from '@mantine/core';
import { IconUpload } from '@tabler/icons-react';

interface HarUploaderProps {
    onImportSuccess?: () => void;
}

const HarUploader: React.FC<HarUploaderProps> = ({ onImportSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const handleFileUpload = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:8000/process-har', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to process HAR file');
            }

            console.log('Processed data:', data.data);
            if (onImportSuccess) {
                onImportSuccess();
            }
            setFile(null);
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Group justify="center" gap="md">
            <FileInput
                label="Choose HAR file"
                description="Select a HAR file to import your player data"
                accept=".har"
                value={file}
                onChange={setFile}
                w={300}
                leftSection={<IconUpload size={20} />}
                disabled={isLoading}
                styles={{
                    label: { color: 'white' },
                    description: { color: 'white' },
                    input: { color: 'white', backgroundColor: '#2a2a2a' }
                }}
            />
            <Button
                onClick={handleFileUpload}
                loading={isLoading}
                disabled={isLoading || !file}
                size="lg"
            >
                {isLoading ? <Loader size="sm" /> : 'Upload'}
            </Button>
            {error && (
                <Text c="red" size="md" ta="center" mt="md">
                    {error}
                </Text>
            )}
        </Group>
    );
};

export default HarUploader; 