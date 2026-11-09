from django.test import TestCase
from django.urls import reverse


class SimulatorPageTests(TestCase):
    def test_home_page_loads(self):
        response = self.client.get(reverse("simulador:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Restaurante da Memória")
        self.assertContains(response, 'id="gameClock"')
        self.assertContains(response, 'id="speedButton"')
        self.assertContains(response, 'id="waitingCard"')
        self.assertContains(response, 'id="secondChanceBanner"')
        self.assertContains(response, 'id="endDialog"')
        self.assertContains(response, 'id="modeDialog"')
        self.assertContains(response, 'id="tutorialModeButton"')
        self.assertContains(response, 'id="tutorialGuide"')
        self.assertContains(response, 'id="nextTutorialButton"')
        self.assertContains(response, 'id="tutorialProgress"')
        self.assertContains(response, 'id="tutorialStageOverlay"')
        self.assertContains(response, 'id="startTutorialStageButton"')
        self.assertContains(response, 'id="technicalHistory"')
