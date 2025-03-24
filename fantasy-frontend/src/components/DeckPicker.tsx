import React, { useState } from 'react';
import { Button, Group, Text, Paper, Badge, Card as MantineCard, Checkbox, ActionIcon, Switch } from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { Card } from '../types/fantasy';

interface DeckForm {
  numEpics: number;
  numRares: number;
  numLegendaries: number;
  maxStars: number;
  noLimitMode: boolean;
  numDecks: number;
  reverseMode: boolean;
  priceLimit: number | null;
  timeLimit: number; // Time limit in seconds
}

interface DeckPickerParams {
  deckForms: DeckForm[];
  useAllCards: boolean;
  useCardsWithOffer: boolean;
}

interface DeckPickerProps {
  onSubmit: (params: DeckPickerParams) => void;
}

export const DeckPicker: React.FC<DeckPickerProps> = ({ onSubmit }) => {
  const [useAllCards, setUseAllCards] = useState(false);
  const [useCardsWithOffer, setUseCardsWithOffer] = useState(false);
  const [deckForms, setDeckForms] = useState<DeckForm[]>([{
    numEpics: 0,
    numRares: 0,
    numLegendaries: 0,
    maxStars: 25,
    noLimitMode: false,
    numDecks: 1,
    reverseMode: false,
    priceLimit: null,
    timeLimit: 30, // Default 30 seconds
  }]);

  const addForm = () => {
    setDeckForms([...deckForms, {
      numEpics: 0,
      numRares: 0,
      numLegendaries: 0,
      maxStars: 25,
      noLimitMode: false,
      numDecks: 1,
      reverseMode: false,
      priceLimit: null,
      timeLimit: 30, // Default 30 seconds
    }]);
  };

  const removeForm = (index: number) => {
    setDeckForms(deckForms.filter((_, i) => i !== index));
  };

  const updateForm = (index: number, newFormData: Partial<DeckForm>) => {
    const newForms = [...deckForms];
    newForms[index] = {
      ...newForms[index],
      ...newFormData,
    };
    setDeckForms(newForms);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      deckForms,
      useAllCards,
      useCardsWithOffer
    });
  };

  const renderForm = (form: DeckForm, index: number) => (
    <Paper p="md" mb="md" key={index} style={{ backgroundColor: '#2a2a2a', position: 'relative' }}>
      <Group justify="space-between" mb="md">
        <Text fw={500} c="white" size="lg">Priority {index + 1}</Text>
        {deckForms.length > 1 && (
          <ActionIcon variant="filled" color="red" onClick={() => removeForm(index)}>
            <IconTrash size="1.125rem" />
          </ActionIcon>
        )}
      </Group>

      <div className="form-group">
        <label>Price Limit (ETH):</label>
        <input
          type="number"
          value={form.priceLimit || ''}
          onChange={(e) => {
            const value = e.target.value ? parseFloat(e.target.value) : null;
            updateForm(index, { priceLimit: value });
          }}
          min="0"
          step="0.01"
          placeholder="No limit"
        />
      </div>

      <div className="form-group checkbox-group">
        <Checkbox
          label="No Limit Mode"
          checked={form.noLimitMode}
          onChange={(e) => updateForm(index, { noLimitMode: e.currentTarget.checked })}
          styles={{
            label: { color: 'white' }
          }}
        />
      </div>

      <div className="form-group">
        <label>
            {form.reverseMode ? 'Minimum' : 'Maximum'} Total Stars
            {form.noLimitMode && ' (ignored in No Limit Mode)'}:
        </label>
        <input
            type="number"
            value={form.maxStars}
            onChange={(e) => updateForm(index, { maxStars: parseInt(e.target.value) || 0 })}
            min="0"
            max="50"
            disabled={form.noLimitMode}
        />
      </div>

      <div className="form-group">
        <label>Maximum Number of Epic Cards (2x){form.noLimitMode && ' (ignored in No Limit Mode)'}:</label>
        <input
          type="number"
          value={form.numEpics}
          onChange={(e) => updateForm(index, { numEpics: parseInt(e.target.value) || 0 })}
          min="0"
          max={form.noLimitMode ? 5 : 5}
          disabled={form.noLimitMode}
        />
      </div>

      <div className="form-group">
        <label>Maximum Number of Rare Cards (1.5x){form.noLimitMode && ' (ignored in No Limit Mode)'}:</label>
        <input
          type="number"
          value={form.numRares}
          onChange={(e) => updateForm(index, { numRares: parseInt(e.target.value) || 0 })}
          min="0"
          max={form.noLimitMode ? 5 : 5}
          disabled={form.noLimitMode}
        />
      </div>

      <div className="form-group">
        <label>Maximum Number of Legendary Cards (2.5x){form.noLimitMode && ' (ignored in No Limit Mode)'}:</label>
        <input
          type="number"
          value={form.numLegendaries}
          onChange={(e) => updateForm(index, { numLegendaries: parseInt(e.target.value) || 0 })}
          min="0"
          max={form.noLimitMode ? 5 : 5}
          disabled={form.noLimitMode}
        />
      </div>

      <div className="form-group">
        <label>Number of Decks for this Priority:</label>
        <input
          type="number"
          value={form.numDecks}
          onChange={(e) => updateForm(index, { numDecks: parseInt(e.target.value) || 1 })}
          min="1"
          max="10"
        />
      </div>

      <div className="form-group">
        <label>Time Limit per Deck (seconds):</label>
        <input
          type="number"
          value={form.timeLimit}
          onChange={(e) => updateForm(index, { timeLimit: parseInt(e.target.value) || 30 })}
          min="1"
          max="300"
          placeholder="30"
        />
      </div>

      <div className="form-group">
        <Switch
          label="Reverse Mode (Pick Lowest Scores)"
          checked={form.reverseMode}
          onChange={(event) => updateForm(index, { reverseMode: event.currentTarget.checked })}
        />
      </div>
    </Paper>
  );

  return (
    <Paper p="md">
      <form onSubmit={handleSubmit} className="deck-picker">
        <Group mb="md">
          <Checkbox
            label="Use All Available Cards"
            checked={useAllCards}
            onChange={(e) => setUseAllCards(e.currentTarget.checked)}
          />
          
          {useAllCards && (
            <Switch
              label="Use Cards With Offer Only"
              checked={useCardsWithOffer}
              onChange={(e) => setUseCardsWithOffer(e.currentTarget.checked)}
            />
          )}
        </Group>
        
        {deckForms.map((form, index) => renderForm(form, index))}
        
        <Button 
          variant="outline" 
          fullWidth 
          mb="md" 
          onClick={addForm}
          rightSection={<IconPlus size="1.125rem" />}
        >
          Add Priority Level
        </Button>

        <Button type="submit" fullWidth mt="md">
          Generate Decks
        </Button>
      </form>
    </Paper>
  );
};

export type { DeckForm };
export default DeckPicker; 