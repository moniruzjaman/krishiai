// This is a partial update - we'll add the optimized analyzer import and case statement

// Add this import at the top of App.tsx (after existing imports)
import OptimizedAnalyzer from './components/OptimizedAnalyzer';

// Then in the renderView function, replace the ANALYZER case:
case View.ANALYZER:
  return (
    <OptimizedAnalyzer 
      onBack={() => handleNavigate(View.HOME)} 
      onAction={() => handleAction(50)} 
      onSaveReport={handleSaveReport} 
      userRank={user.progress.rank} 
      userCrops={user.myCrops} 
      onNavigate={handleNavigate} 
      lang={lang} 
    />
  );