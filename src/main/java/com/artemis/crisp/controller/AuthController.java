package com.artemis.crisp.controller;
import com.artemis.crisp.dto.*;
import com.artemis.crisp.model.User;
import com.artemis.crisp.model.enums.UserStatus;
import com.artemis.crisp.repository.UserRepository;
import com.artemis.crisp.util.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
@CrossOrigin(origins="*") @RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authManager;
    private final JwtTokenUtil jwtUtil;
    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest req) {
        authManager.authenticate(new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        return ResponseEntity.ok(new AuthResponse(jwtUtil.generateToken(req.getUsername()), req.getUsername()));
    }
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest req) {
        if (userRepo.findByUsername(req.getUsername()).isPresent())
            return ResponseEntity.badRequest().body("Username already exists");
        User u = new User(); u.setUsername(req.getUsername());
        u.setPassword(encoder.encode(req.getPassword()));
        u.setFullName(req.getFullName()); u.setStatus(UserStatus.OFFLINE);
        userRepo.save(u);
        return ResponseEntity.ok("User registered successfully");
    }
}
