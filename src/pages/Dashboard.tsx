import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Calendar from '@/components/Calendar';
import Dashboard from '@/components/Dashboard';
import PersonProfile from '@/components/PersonProfile';
import PersonProfileModal from '@/components/PersonProfileModal';
import PersonProfileViewModal from '@/components/PersonProfileViewModal';
import EventModal from '@/components/EventModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import AIUsageBadge from '@/components/AIUsageBadge';
import { Plus, Calendar as CalendarIcon, Users, BarChart3, Sparkles, LogOut, Settings, Shield } from 'lucide-react';
import { Person, Event } from '@/types';
import { useSupabasePersons } from '@/hooks/useSupabasePersons';
import { useSupabaseEvents } from '@/hooks/useSupabaseEvents';
import { generateAutoEventsForPerson, updateAllAutoEvents } from '@/utils/autoEvents';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-calendar.jpg';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { profile } = useProfile();
  
  // Use Supabase hooks instead of localStorage
  const { persons, loading: personsLoading, savePerson } = useSupabasePersons();
  const { events, loading: eventsLoading, saveEvent, saveMultipleEvents, deleteEvent } = useSupabaseEvents();
  
  // Modal states
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [isPersonViewModalOpen, setIsPersonViewModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
      
      if (!user) {
        navigate('/auth');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Générer automatiquement tous les événements anniversaire manquants
  useEffect(() => {
    if (!personsLoading && !eventsLoading && persons.length > 0) {
      console.log('🔍 Vérification des événements automatiques...');
      console.log('Personnes:', persons.map(p => ({ nom: p.name, anniversaire: p.birthday })));
      console.log('Événements existants:', events.length);
      
      const missingAutoEvents = updateAllAutoEvents(persons, events);
      console.log('Événements manquants générés:', missingAutoEvents.length, missingAutoEvents);
      
      if (missingAutoEvents.length > 0) {
        console.log('💾 Sauvegarde des événements automatiques...');
        saveMultipleEvents(missingAutoEvents);
      }
    }
  }, [persons, events, personsLoading, eventsLoading, saveMultipleEvents]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de se déconnecter",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });
      navigate('/');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return null;
  }

  const handleSavePerson = async (person: Person) => {
    const isUpdate = !!editingPerson;
    const success = await savePerson(person, isUpdate);
    
    if (success) {
      setEditingPerson(undefined);
      
      // Générer automatiquement les événements anniversaire manquants pour cette personne
      const autoEvents = generateAutoEventsForPerson(person, events);
      if (autoEvents.length > 0) {
        await saveMultipleEvents(autoEvents);
      }
    }
  };

  const handleSaveEvent = async (event: Event) => {
    const isUpdate = !!editingEvent;
    const success = await saveEvent(event, isUpdate);
    
    if (success) {
      setEditingEvent(undefined);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setIsPersonModalOpen(true);
  };

  const handleViewPerson = (person: Person) => {
    setViewingPerson(person);
    setIsPersonViewModalOpen(true);
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
            <div className="flex items-center justify-end gap-3 mb-4">
              <AIUsageBadge />
              <ThemeToggle />
              {profile?.role === 'admin' && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline" 
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Administration
                </Button>
              )}
              <Button
                onClick={() => navigate('/account')}
                variant="outline" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Mon compte
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline" 
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              <Sparkles className="inline-block w-8 h-8 md:w-12 md:h-12 mr-3 text-primary-glow" />
              GiftCalendar
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow-md">
              L'assistant intelligent qui n'oublie jamais vos proches
            </p>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Bienvenue {user.email} ! Créez des profils détaillés, planifiez vos événements et laissez notre IA commander 
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
            <Calendar events={events} persons={persons} onDeleteEvent={deleteEvent} />
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
                    onViewProfile={() => handleViewPerson(person)}
                  />
                </div>
              ))}
              
              {persons.length === 0 && !personsLoading && (
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

        <PersonProfileViewModal
          person={viewingPerson}
          isOpen={isPersonViewModalOpen}
          onOpenChange={setIsPersonViewModalOpen}
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

export default DashboardPage;