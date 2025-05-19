import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "react-query";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, UserPlus, ParkingCircle, ArrowLeft } from "lucide-react";
// import { Logo } from "../ui/logo"; // Using image logo
import { registerUser } from "../../api/auth"; // Assuming path
import { Input } from "../ui/input";   // Assuming path
import { Label } from "../ui/label";   // Assuming path
import { Button } from "../ui/button"; // Assuming path
import { Loader } from "../ui/loader";   // Assuming path
import { useAuth } from "../../context/auth-context"; // Assuming path

const registerSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(10, "Password must be at least 10 characters")
      .regex(/(?=.*[a-z])/, "Must contain a lowercase letter")
      .regex(/(?=.*[A-Z])/, "Must contain an uppercase letter")
      .regex(/(?=.*\d)/, "Must contain a digit")
      .regex(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`])/, "Must contain a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // Get isAuthenticated
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) { // Use isAuthenticated for redirection
      navigate("/dashboard", { replace: true }); // Or your default authenticated route
    }
  }, [isAuthenticated, navigate]);

  const registerMutation = useMutation(registerUser, {
    onSuccess: () => {
      toast.success("Registration successful! Please check your email to verify your account.");
      navigate("/verify-email", { state: { email: formData.email } });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
      setErrors({ general: errorMsg }); // Set a general error
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
    if (errors.general) setErrors(prev => ({ ...prev, general: undefined }));
    if (name === "password" && errors.confirmPassword === "Passwords don't match") {
      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0]] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    // Only send necessary fields, not confirmPassword
    registerMutation.mutate({
      name: result.data.name,
      email: result.data.email,
      password: result.data.password,
    });
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
            Join the Future of Parking. <br />Quick Sign-Up, Smart Solutions.
          </p>
          <div className="mt-16">
            {/* <UserPlus size={150} strokeWidth={0.75} className="mx-auto text-white/20 opacity-40" /> */}
            <p className="text-xs mt-4 opacity-50 tracking-wider"> BECOME A MEMBER</p>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 lg:py-12 lg:px-10 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6 lg:hidden">
            <Link to="/">
              <img src="/images/logo2.png" alt="ParkWell Logo" className="h-10 w-auto text-brand-yellow" />
            </Link>
          </div>
          <div className="bg-card-bg shadow-2xl rounded-xl p-8 border border-theme-border-default/20">
            <div className="text-left mb-4"> {/* Back button moved up */}
              <Link to="/login" className="inline-flex items-center text-sm text-link hover:text-link-hover group">
                <ArrowLeft size={16} className="mr-1.5 transition-transform duration-150 group-hover:-translate-x-1" />
                Back to Sign In
              </Link>
            </div>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main mb-1.5">Create Your Account</h2>
              <p className="text-text-muted text-sm">Let's get you started with ParkWell.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4"> {/* Reduced space-y slightly */}
              <div>
                <Label htmlFor="name" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Full Name</Label>
                <Input id="name" name="name" type="text" autoComplete="name" value={formData.name} onChange={handleChange}
                  className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4 border-2 transition-all duration-150 ease-in-out focus:bg-card-bg focus:outline-none focus:ring-2 focus:ring-brand-yellow  ${errors.name ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                  placeholder="e.g., Alex Johnson"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="email" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange}
                  className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4 border-2 transition-all duration-150 ease-in-out focus:bg-card-bg focus:outline-none focus:ring-2 focus:ring-brand-yellow  ${errors.email ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="password" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Password</Label>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={formData.password} onChange={handleChange}
                    className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4 border-2 transition-all duration-150 ease-in-out focus:bg-card-bg focus:outline-none focus:ring-2 focus:ring-brand-yellow  ${errors.password ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                    placeholder="Create a strong password"
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-placeholder hover:text-text-main" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="block text-xs font-semibold text-text-main mb-1.5 tracking-wide uppercase">Confirm Password</Label>
                <div className="relative">
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange}
                    className={`w-full bg-input-bg text-text-main placeholder-text-placeholder rounded-md py-3 px-4 border-2 transition-all duration-150 ease-in-out focus:bg-card-bg focus:outline-none focus:ring-2 focus:ring-brand-yellow  ${errors.confirmPassword ? "border-destructive ring-1 ring-destructive/30" : "border-theme-border-input"}`}
                    placeholder="Re-type your password"
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-placeholder hover:text-text-main" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              {errors.general && <p className="text-sm text-destructive text-center py-2">{errors.general}</p>}

              <Button type="submit" disabled={registerMutation.isLoading}
                className="w-full mt-6 flex items-center justify-center py-3 text-sm sm:text-base bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-brand font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-brand-yellow disabled:opacity-70 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {registerMutation.isLoading ? (
                  <> <Loader size="sm" className="mr-2" colorClassName="border-text-on-brand" /> Creating Account... </>
                ) : (
                  <> <UserPlus size={18} className="mr-2" /> Create Account </>
                )}
              </Button>
              <div className="text-center pt-3">
                <p className="text-sm text-text-muted">
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-link hover:text-link-hover hover:underline">Sign In</Link>
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