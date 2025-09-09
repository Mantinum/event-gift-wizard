import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calendar from '@/components/Calendar';
import Dashboard from '@/components/Dashboard';
import PersonProfile from '@/components/PersonProfile';
import PersonProfileModal from '@/components/PersonProfileModal';
import EventModal from '@/components/EventModal';
import { Plus, Calendar as CalendarIcon, Users, BarChart3, Sparkles } from 'lucide-react';
import { Person, Event } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import heroImage from '@/assets/hero-calendar.jpg';

const initialPersons: Person[] = [
  {
    id: '1',
    name: 'Sophie Martin',
    avatar: '',
    interests: ['Cuisine', 'Yoga', 'Lecture', 'Voyage', 'Photographie'],
    budget: 50,
    relationship: 'Soeur',
    birthday: '1990-04-15',
    lastGift: 'Livre de recettes healthy',
    preferredCategories: ['Livres', 'Bien-être', 'Cuisine'],
    notes: 'Adore la cuisine végétarienne et le yoga matinal',
    email: 'sophie.martin@email.com'
  },
  {
    id: '2',
    name: 'Paul Dubois',
    avatar: '',
    interests: ['Vin', 'Golf', 'Tech', 'Musique'],
    budget: 120,
    relationship: 'Ami proche',
    birthday: '1985-11-22',
    lastGift: 'Écouteurs Bluetooth',
    preferredCategories: ['Tech', 'Sport', 'Alcool'],
    notes: 'Passionné de technologie et amateur de bon vin'
  },
  {
    id: '3',
    name: 'Marie Laurent',
    avatar: '',
    interests: ['Art', 'Jardinage', 'Décoration', 'Mode'],
    budget: 80,
    relationship: 'Cousine',
    birthday: '1992-07-08',
    preferredCategories: ['Décoration', 'Mode', 'Art'],
    notes: 'Très créative, aime décorer sa maison'
  }
];

const initialEvents: Event[] = [
  {
    id: '1',
    title: 'Anniversaire Sophie',
    date: '2024-09-15',
    type: 'birthday',
    personId: '1',
    person: 'Sophie Martin',
    budget: 50,
    status: 'upcoming',
    reminderDays: 3
  },
  {
    id: '2',
    title: 'Mariage Paul & Marie',
    date: '2024-09-22',
    type: 'wedding',
    personId: '2',
    person: 'Paul Dubois',
    budget: 150,
    status: 'upcoming',
    reminderDays: 7
  }
];

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [persons, setPersons] = useLocalStorage<Person[]>('giftcalendar-persons', initialPersons);
  const [events, setEvents] = useLocalStorage<Event[]>('giftcalendar-events', initialEvents);
  
  // Modal states
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

  const handleSavePerson = (person: Person) => {
    if (editingPerson) {
      // Update existing person
      setPersons(persons.map(p => p.id === person.id ? person : p));
      setEditingPerson(undefined);
    } else {
      // Add new person
      setPersons([...persons, person]);
    }
  };

  const handleSaveEvent = (event: Event) => {
    if (editingEvent) {
      // Update existing event
      setEvents(events.map(e => e.id === event.id ? event : e));
      setEditingEvent(undefined);
    } else {
      // Add new event
      setEvents([...events, event]);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setIsPersonModalOpen(true);
  };

  const openNewPersonModal = () => {
    setEditingPerson(undefined);
    setIsPersonModalOpen(true);
  };

  const openNewEventModal = () => {
    setEditingEvent(undefined);
    setIsEventModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Smart Calendar" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              <Sparkles className="inline-block w-8 h-8 md:w-12 md:h-12 mr-3 text-primary-glow" />
              GiftCalendar
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow-md">
              L'assistant intelligent qui n'oublie jamais vos proches
            </p>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Créez des profils détaillés, planifiez vos événements et laissez notre IA commander 
              automatiquement les cadeaux parfaits selon les goûts et votre budget.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-4 bg-card shadow-card">
              <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Calendrier</span>
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Profils</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Tableau de bord
              </h2>
              <p className="text-muted-foreground">
                Suivez vos prochains achats automatiques et vos événements à venir
              </p>
            </div>
            <Dashboard events={events} persons={persons} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Calendrier des événements
                </h2>
                <p className="text-muted-foreground">
                  Visualisez tous vos événements et les cadeaux programmés
                </p>
              </div>
              <Button 
                onClick={openNewEventModal}
                className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300 animate-bounce-in"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvel événement
              </Button>
            </div>
            <Calendar events={events} persons={persons} />
          </TabsContent>

          <TabsContent value="profiles" className="mt-6">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Profils de vos proches
                </h2>
                <p className="text-muted-foreground">
                  Gérez les profils et préférences de vos proches
                </p>
              </div>
              <Button 
                onClick={openNewPersonModal}
                className="bg-gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300 animate-bounce-in"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau profil
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {persons.map((person, index) => (
                <div key={person.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <PersonProfile 
                    person={person}
                    onEdit={() => handleEditPerson(person)}
                  />
                </div>
              ))}
              
              {persons.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Aucun profil créé</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par créer le profil d'un proche pour organiser ses cadeaux
                  </p>
                  <Button 
                    onClick={openNewPersonModal}
                    className="bg-gradient-primary text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer le premier profil
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Créer nouveau
              </h2>
              <p className="text-muted-foreground">
                Ajoutez un événement, un profil ou configurez vos préférences
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group animate-fade-in"
                onClick={openNewEventModal}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                    <CalendarIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nouvel événement</h3>
                  <p className="text-muted-foreground text-sm">
                    Ajoutez un anniversaire, mariage ou autre célébration
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group animate-fade-in"
                onClick={openNewPersonModal}
                style={{ animationDelay: '100ms' }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-purple-accent rounded-full flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nouveau profil</h3>
                  <p className="text-muted-foreground text-sm">
                    Créez un profil détaillé pour une nouvelle personne
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer group animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow group-hover:scale-110 transition-all duration-300">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Configuration</h3>
                  <p className="text-muted-foreground text-sm">
                    Paramétrez vos budgets et préférences d'achat
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <PersonProfileModal
          person={editingPerson}
          isOpen={isPersonModalOpen}
          onOpenChange={setIsPersonModalOpen}
          onSave={handleSavePerson}
        />

        <EventModal
          event={editingEvent}
          persons={persons}
          isOpen={isEventModalOpen}
          onOpenChange={setIsEventModalOpen}
          onSave={handleSaveEvent}
        />
      </div>
    </div>
  );
};

export default Index;