import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "react-query";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, LogIn, ParkingCircle } from "lucide-react"; // Using ParkingCircle for placeholder
// import { Logo } from "../ui/logo"; // Integrated textual logo
import { loginUser } from "../../api/auth";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Loader } from "../ui/loader";
import { useAuth } from "../../context/auth-context"; // Make sure path is correct

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."), // Keeping min(1) as presence is validated
  rememberMe: z.boolean().optional(),
});

export const LoginForm = () => {
  const navigate = useNavigate();
  const { user, login: contextLogin, isAuthenticated } = useAuth(); // Get isAuthenticated
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Use isAuthenticated for a more reliable check from context
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true }); // Or your default authenticated route
    }
  }, [isAuthenticated, navigate]);

  const loginMutation = useMutation(loginUser, {
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      toast.success("Login successful! Welcome back.");
      window.location.href = "/dashboard"; // Or navigate and use context
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message ||
        "Login failed. Please check your credentials."
      );
      setFormData((prev) => ({ ...prev, password: "" }));
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    // Clear specific field error and general error when user types
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    if (errors.general) setErrors(prev => ({ ...prev, general: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors

    const result = loginSchema.safeParse(formData); // Use safeParse for better error object

    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setErrors(fieldErrors);
      return; // Stop submission if Zod validation fails
    }
    // If Zod validation passes, proceed with mutation
    loginMutation.mutate(result.data); // Pass validated data
  };

  return (
    <div className="flex min-h-screen bg-page-bg">
      {/* Left Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col items-center justify-center bg-golden-hour-gradient p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-brand-yellow-light/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-yellow-dark/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        <div className="relative z-10 text-center">
          <Link to="/" className="inline-block mb-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md">
            <img src="/images/logo2.png" alt="ParkWell Logo" className="h-20 w-auto mx-auto opacity-90 drop-shadow-lg" />
            <h1 className="text-5xl font-bold mt-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-yellow-50 to-yellow-100 drop-shadow-sm">
              ParkWell
            </h1>
          </Link>
          <p className="text-xl mt-6 font-light max-w-xs sm:max-w-sm mx-auto leading-relaxed opacity-80">
            Seamless Parking, Golden Experience. Find and manage your spot with unparalleled ease.
          </p>
          <div className="mt-16">
            {/* <ParkingCircle size={150} strokeWidth={0.75} className="mx-auto text-white/20 opacity-40" /> */}
            <p className="text-xs mt-4 opacity-50 tracking-wider"> SMART PARKING GRID</p>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm"> {/* Max width for form container */}
          <div className="flex justify-center mb-6 lg:hidden">
            <Link to="/">
              <img src="/images/logo2.png" alt="ParkWell Logo" className="h-10 w-auto text-brand-yellow" />
            </Link>
          </div>
          <div className="bg-card-bg shadow-2xl rounded-xl p-8 border border-theme-border-default/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main mb-1.5">
                Welcome Back!
              </h2>
              <p className="text-text-muted text-sm">
                Sign in to your ParkWell account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange}
                  className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4
                            border-2 transition-all duration-150 ease-in-out
                            focus:bg-card-bg focus:outline-none 
                            ${errors.email ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={formData.password} onChange={handleChange}
                    className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4
                                border-2 transition-all duration-150 ease-in-out
                                focus:bg-card-bg focus:outline-none 
                                ${errors.password ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                    placeholder="Enter your password"
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-placeholder hover:text-text-main" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input id="rememberMe" name="rememberMe" type="checkbox" checked={formData.rememberMe} onChange={handleChange} className="h-4 w-4 text-brand-yellow border-theme-border-input rounded focus:ring-brand-yellow focus:ring-offset-card-bg" />
                  <Label htmlFor="rememberMe" className="ml-2 text-text-main cursor-pointer text-xs sm:text-sm">Remember Me</Label>
                </div>
                <Link to="/forgot-password" className="font-medium text-link hover:text-link-hover text-xs sm:text-sm hover:underline">Forgot?</Link>
              </div>

              {errors.general && <p className="text-sm text-destructive text-center py-2">{errors.general}</p>}

              <Button type="submit" disabled={loginMutation.isLoading}
                className="w-full flex items-center justify-center py-3 text-sm sm:text-base bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-brand font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-brand-yellow disabled:opacity-70 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loginMutation.isLoading ? (
                  <> <Loader size="sm" className="mr-2" colorClassName="border-text-on-brand" /> Signing In... </>
                ) : (
                  <> <LogIn size={18} className="mr-2" /> Sign In </>
                )}
              </Button>
              <div className="text-center pt-3">
                <p className="text-sm text-text-muted">
                  New to ParkWell?{" "}
                  <Link to="/register" className="font-medium text-link hover:text-link-hover hover:underline">Create an Account</Link>
                </p>
              </div>
            </form>
          </div>
          <p className="text-center text-xs text-text-muted mt-8">
            © {new Date().getFullYear()} ParkWell Systems.
          </p>
        </div>
      </div>
    </div>
  );
};