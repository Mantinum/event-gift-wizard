import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StepIndicator } from '@/components/StepIndicator';
import { RELATIONSHIP_TYPES } from '@/types';
import { ArrowRight, Heart, Users, Baby, Crown } from 'lucide-react';

const relationshipIcons: { [key: string]: any } = {
  'Conjoint(e)': Heart,
  'Enfant': Baby,
  'Parent': Users,
  'Ami(e)': Users,
  'Collègue': Users,
  'Belle-famille': Crown,
  'Autre': Users,
};

const GiftFor = () => {
  const navigate = useNavigate();
  const [selectedRelationship, setSelectedRelationship] = useState('');

  const handleNext = () => {
    if (selectedRelationship) {
      // Store the relationship in session storage for the onboarding flow
      sessionStorage.setItem('onboarding-relationship', selectedRelationship);
      navigate('/birthday');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pour qui voulez-vous offrir un cadeau ?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sélectionnez le type de relation pour personnaliser au mieux nos suggestions
          </p>
        </div>

        <StepIndicator 
          currentStep={1} 
          totalSteps={4} 
          stepTitles={['Qui ?', 'Anniversaire', 'Goûts', 'Suggestions']} 
        />

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {RELATIONSHIP_TYPES.map((relationship) => {
              const Icon = relationshipIcons[relationship] || Users;
              const isSelected = selectedRelationship === relationship;
              
              return (
                <Card 
                  key={relationship}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-elegant hover:scale-105 ${
                    isSelected ? 'ring-2 ring-primary bg-gradient-card shadow-glow' : 'hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedRelationship(relationship)}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
                      isSelected ? 'bg-gradient-primary shadow-glow' : 'bg-muted'
                    }`}>
                      <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {relationship}
                    </h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleNext}
              disabled={!selectedRelationship}
              size="lg"
              className="bg-gradient-primary text-white px-8 py-4 text-lg shadow-elegant hover:shadow-glow hover:scale-105 transition-all duration-300"
            >
              Continuer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftFor;