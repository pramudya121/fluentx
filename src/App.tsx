import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "@/contexts/Web3Context";
import Navbar from "@/components/Navbar";
import SakuraBackground from "@/components/SakuraBackground";
import Index from "./pages/Index";
import Marketplace from "./pages/Marketplace";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import MintNFT from "./pages/MintNFT";
import Activity from "./pages/Activity";
import Leaderboard from "./pages/Leaderboard";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import NFTDetail from "./pages/NFTDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="relative min-h-screen">
            <SakuraBackground />
            <div className="relative z-10">
              <Navbar />
              <div className="pt-20">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/collections" element={<Collections />} />
                  <Route path="/collections/:id" element={<CollectionDetail />} />
                  <Route path="/mint" element={<MintNFT />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/nft/:id" element={<NFTDetail />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;
