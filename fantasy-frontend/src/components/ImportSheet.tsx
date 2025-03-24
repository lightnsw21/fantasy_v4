import React, { useState } from 'react';
import { Button, Text, Group, Paper, Loader, FileInput } from '@mantine/core';
import { importFantasySheet } from '../services/api';
import { IconUpload } from '@tabler/icons-react';

interface ImportSheetProps {
    onImportSuccess?: () => void;
}

const ImportSheet: React.FC<ImportSheetProps> = ({ onImportSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const handleImport = async () => {
        if (!file) {
            setError('Please select a file to import');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await importFantasySheet(file);
            console.log('Import successful:', result);
            if (onImportSuccess) {
                onImportSuccess();
            }
            setFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred during import');
            console.error('Import error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Paper p="xl" radius="md" style={{ backgroundColor: '#3a3a3a' }} mb="xl">
            <Group justify="center" gap="md">
                <FileInput
                    label="Choose Excel file"
                    description="Upload your fantasy sheets Excel file"
                    accept=".xlsx,.xls"
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
                    onClick={handleImport}
                    loading={isLoading}
                    disabled={isLoading || !file}
                    size="lg"
                >
                    {isLoading ? <Loader size="sm" /> : 'Upload'}
                </Button>
            </Group>
            {error && (
                <Text c="red" size="md" ta="center" mt="md">
                    {error}
                </Text>
            )}
        </Paper>
    );
};

export default ImportSheet; 