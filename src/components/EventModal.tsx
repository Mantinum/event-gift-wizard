import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Save,
  Gift,
  MapPin,
  Bell,
  Euro
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Event, Person, EVENT_TYPES } from '@/types';
import { cn } from '@/lib/utils';

interface EventModalProps {
  event?: Event;
  persons: Person[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Event) => void;
}

const EventModal = ({ 
  event, 
  persons,
  isOpen, 
  onOpenChange, 
  onSave
}: EventModalProps) => {
  const [formData, setFormData] = useState<Partial<Event>>({
    title: event?.title || '',
    type: event?.type || 'birthday',
    personId: event?.personId || '',
    person: event?.person || '',
    budget: event?.budget || 50,
    description: event?.description || '',
    location: event?.location || '',
    reminderDays: event?.reminderDays || 3,
    status: event?.status || 'upcoming'
  });

  const [date, setDate] = useState<Date | undefined>(
    event?.date ? new Date(event.date) : undefined
  );

  // Update form data when event prop changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        type: event.type || 'birthday',
        personId: event.personId || '',
        person: event.person || '',
        budget: event.budget || 50,
        description: event.description || '',
        location: event.location || '',
        reminderDays: event.reminderDays || 3,
        status: event.status || 'upcoming'
      });
      setDate(event.date ? new Date(event.date) : undefined);
    } else {
      // Reset form for new event
      setFormData({
        title: '',
        type: 'birthday',
        personId: '',
        person: '',
        budget: 50,
        description: '',
        location: '',
        reminderDays: 3,
        status: 'upcoming'
      });
      setDate(undefined);
    }
  }, [event]);

  const handleSave = () => {
    if (!formData.title || !formData.personId || !date || !formData.type) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const selectedPerson = persons.find(p => p.id === formData.personId);
    if (!selectedPerson) {
      toast({
        title: "Erreur",
        description: "Personne sélectionnée introuvable",
        variant: "destructive",
      });
      return;
    }

    const eventData: Event = {
      id: event?.id || '', // Laisser vide pour les nouveaux événements, Supabase génèrera l'UUID
      title: formData.title,
      type: formData.type,
      personId: formData.personId,
      person: selectedPerson.name,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      budget: formData.budget || selectedPerson.budget,
      description: formData.description,
      location: formData.location,
      reminderDays: formData.reminderDays || 3,
      status: formData.status || 'upcoming'
    };

    onSave(eventData);
    onOpenChange(false);
    
    toast({
      title: event ? "Événement modifié" : "Événement créé",
      description: `L'événement "${eventData.title}" a été ${event ? 'modifié' : 'créé'} avec succès`,
    });
  };

  const selectedEventType = EVENT_TYPES.find(type => type.value === formData.type);
  const selectedPerson = persons.find(p => p.id === formData.personId);

  // Suggestion automatique du titre basé sur le type et la personne
  const suggestTitle = (type: string, personName: string) => {
    if (!personName) return '';
    
    switch (type) {
      case 'birthday':
        return `Anniversaire de ${personName}`;
      case 'wedding':
        return `Mariage de ${personName}`;
      case 'anniversary':
        return `Anniversaire de mariage de ${personName}`;
      case 'baptism':
        return `Baptême de ${personName}`;
      case 'christmas':
        return `Noël - ${personName}`;
      default:
        return `Événement - ${personName}`;
    }
  };

  // Auto-suggestion du titre quand on change de personne ou de type
  const handlePersonChange = (personId: string) => {
    const person = persons.find(p => p.id === personId);
    if (person) {
      const suggestedTitle = suggestTitle(formData.type || 'birthday', person.name);
      setFormData({
        ...formData,
        personId,
        person: person.name,
        title: formData.title || suggestedTitle,
        budget: formData.budget || person.budget
      });
    }
  };

  const handleTypeChange = (type: string) => {
    const suggestedTitle = selectedPerson ? suggestTitle(type, selectedPerson.name) : '';
    setFormData({
      ...formData,
      type: type as Event['type'],
      title: formData.title || suggestedTitle
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Gift className="h-6 w-6 text-primary" />
            <span>{event ? 'Modifier l\'événement' : 'Nouvel événement'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations principales */}
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="person" className="text-sm font-medium">
                    Personne concernée *
                  </Label>
                  <Select value={formData.personId} onValueChange={handlePersonChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir une personne" />
                    </SelectTrigger>
                    <SelectContent>
                      {persons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          <div className="flex items-center space-x-2">
                            <span>{person.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({person.relationship})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type" className="text-sm font-medium">
                    Type d'événement *
                  </Label>
                  <Select value={formData.type} onValueChange={handleTypeChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${type.color}`} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Titre de l'événement *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Anniversaire de Sophie"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Date de l'événement *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 animate-fade-in">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="budget" className="text-sm font-medium flex items-center space-x-1">
                    <Euro className="h-4 w-4 text-success" />
                    <span>Budget pour ce cadeau</span>
                  </Label>
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    className="mt-1"
                    min="5"
                    max="1000"
                  />
                  {selectedPerson && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Budget habituel: {selectedPerson.budget}€
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détails optionnels */}
          <Card className="shadow-card">
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails sur l'événement, préférences particulières..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location" className="text-sm font-medium flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>Lieu</span>
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Restaurant Le Gourmet, Paris"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="reminder" className="text-sm font-medium flex items-center space-x-1">
                    <Bell className="h-4 w-4" />
                    <span>Rappel (jours avant)</span>
                  </Label>
                  <Select 
                    value={formData.reminderDays?.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, reminderDays: Number(value) })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 jour avant</SelectItem>
                      <SelectItem value="3">3 jours avant</SelectItem>
                      <SelectItem value="7">1 semaine avant</SelectItem>
                      <SelectItem value="14">2 semaines avant</SelectItem>
                      <SelectItem value="30">1 mois avant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu */}
          {selectedEventType && selectedPerson && (
            <Card className="shadow-card bg-gradient-card animate-fade-in">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <span>Aperçu de l'événement</span>
                </h4>
                <div className="flex items-center space-x-3">
                  <Badge className={`${selectedEventType.color} text-white`}>
                    {selectedEventType.label}
                  </Badge>
                  <span className="font-medium">{formData.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {date ? format(date, "dd/MM/yyyy") : 'Date non définie'}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {formData.budget}€
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300"
          >
            <Save className="mr-2 h-4 w-4" />
            {event ? 'Modifier' : 'Créer l\'événement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;